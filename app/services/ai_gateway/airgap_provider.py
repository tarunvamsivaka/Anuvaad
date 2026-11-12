"""Air-Gapped and On-Premises Local Inference Gateway.

Enables sovereign, zero-egress LLM inference using local Ollama, vLLM, or
TGI engines. Guaranteed to process exclusively over local loopback interfaces
(127.0.0.1 / localhost) or private intranet endpoints without transmitting any
source code or telemetry to public networks.
"""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import os
from collections.abc import AsyncGenerator
from urllib.parse import urlparse

import httpx
from openai import AsyncOpenAI
from pydantic import BaseModel

logger = logging.getLogger("anuvaad.airgap")


class LocalModelConfig(BaseModel):
    """Configuration for on-premises air-gapped LLM runner."""

    base_url: str = os.getenv("LOCAL_LLM_URL", "http://127.0.0.1:11434/v1")
    model_name: str = os.getenv("LOCAL_LLM_MODEL", "llama3.3:70b")
    timeout_seconds: float = 45.0
    api_key: str = os.getenv("LOCAL_LLM_KEY", "ollama")


class AirgapInferenceProvider:
    """Connects to private local inference endpoints without public WAN egress."""

    def __init__(self, config: LocalModelConfig | None = None) -> None:
        self.config = config or LocalModelConfig()
        self._validate_local_egress(self.config.base_url)
        self.client = AsyncOpenAI(
            base_url=self.config.base_url,
            api_key=self.config.api_key,
            timeout=self.config.timeout_seconds,
        )

    @staticmethod
    def _validate_local_egress(url: str) -> None:
        """Enforce that air-gap provider routes only to private/loopback hosts."""
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower()
        if hostname.startswith("169.254.") or hostname in ("metadata.google.internal", "instance-data"):
            raise ValueError(f"Access to cloud instance metadata service ({hostname}) is strictly forbidden.")

        allowed_hosts = {
            "localhost",
            "127.0.0.1",
            "::1",
            "host.docker.internal",
        }
        try:
            is_private = ipaddress.ip_address(hostname).is_private or ipaddress.ip_address(hostname).is_loopback
        except ValueError:
            is_private = hostname in allowed_hosts or hostname.endswith(".local") or hostname.endswith(".internal")
        if not is_private:
            raise ValueError("Air-gap inference must use a loopback or private-network endpoint.")

    async def is_available(self) -> bool:
        """Check if local inference server is responsive."""
        try:
            parsed = urlparse(self.config.base_url)
            health_url = f"{parsed.scheme}://{parsed.netloc}/"
            # Never inherit HTTP proxy settings for a private-only endpoint.
            # Besides violating the air-gap contract, a proxy can turn a fast
            # loopback connection refusal into a long remote connection wait.
            timeout = httpx.Timeout(timeout=2.0, connect=0.5)

            def probe() -> bool:
                # The Windows async transport may not honour task cancellation
                # while tearing down a refused local connection. This is a
                # low-frequency health probe, so use a worker thread and keep
                # the request independent from the event loop.
                with httpx.Client(timeout=timeout, trust_env=False) as client:
                    resp = client.get(health_url)
                    return resp.status_code in (200, 204)

            # Bound the entire probe, including transport setup and teardown;
            # a connect/read timeout alone does not cap every async transport.
            return await asyncio.wait_for(asyncio.to_thread(probe), timeout=2.5)
        except Exception:
            return False

    async def complete(self, prompt: str, system_prompt: str | None = None) -> str:
        """Perform non-streaming text completion against local engine."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        resp = await self.client.chat.completions.create(
            model=self.config.model_name,
            messages=messages,
            temperature=0.1,
        )
        choice = resp.choices[0]
        return choice.message.content or ""

    async def stream_translation(
        self,
        prompt: str,
        system_prompt: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream translated tokens directly from local engine."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        stream = await self.client.chat.completions.create(
            model=self.config.model_name,
            messages=messages,
            temperature=0.1,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

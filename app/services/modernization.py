import asyncio
import logging
from typing import Any

from app.services.ai import get_completion

logger = logging.getLogger("anuvaad.modernization")

class LegacyModernizationOrchestrator:
    """
    Multi-agent orchestrator for migrating entire legacy codebases (e.g. COBOL, Fortran, legacy Java)
    to modern microservices (e.g. Rust, Go, TypeScript) using DeepSeek Reasoner.
    """

    def __init__(self, target_stack: str = "rust", use_r1: bool = True):
        self.target_stack = target_stack
        self.use_r1 = use_r1

    async def analyze_dependencies(self, files: list[dict[str, str]]) -> dict[str, Any]:
        """Step 1: Analyze inter-file dependencies and build an AST graph representation."""
        logger.info(f"Analyzing {len(files)} files for dependency graph.")

        system_prompt = """
        You are an expert Systems Architect. Analyze the provided legacy files and extract the dependency graph,
        shared global state, and data flow. Return a JSON object with 'nodes' (files) and 'edges' (dependencies).
        """

        payload = "\n\n".join([f"--- FILE: {f['name']} ---\n{f['content']}" for f in files])

        result, model = await get_completion(
            prompt=payload,
            system_instruction=system_prompt,
            mode="explanation",
            use_r1=self.use_r1
        )
        return {"graph": result, "model_used": model}

    async def generate_microservice_scaffold(self, architecture_graph: dict[str, Any]) -> dict[str, str]:
        """Step 2: Generate modern folder structure and boilerplate based on AST graph."""
        logger.info("Generating microservice scaffolding...")

        system_prompt = f"""
        You are a principal engineer. Based on the provided architecture graph of a legacy monolithic system,
        generate a modern, idiomatic {self.target_stack} microservice scaffolding.
        Return a JSON object where keys are file paths and values are the initial boilerplate code.
        """

        result, model = await get_completion(
            prompt=str(architecture_graph),
            system_instruction=system_prompt,
            mode="translation",
            use_r1=self.use_r1
        )
        return {"scaffold": result, "model_used": model}

    async def migrate_business_logic(self, source_file: str, source_content: str, target_file_context: str) -> str:
        """Step 3: Translate core business logic to the new stack."""
        system_prompt = f"""
        Translate the provided legacy business logic into highly optimized, idiomatic {self.target_stack}.
        Ensure all edge cases and implicit behaviors from the legacy system are explicitly handled.
        Context of the target microservice: {target_file_context}
        """

        result, _ = await get_completion(
            prompt=f"Legacy File: {source_file}\n\nCode:\n{source_content}",
            system_instruction=system_prompt,
            mode="translation",
            use_r1=self.use_r1
        )
        return result

    async def generate_unit_tests(self, migrated_code: str) -> str:
        """Step 4: Generate comprehensive unit tests to verify migration fidelity."""
        system_prompt = f"""
        Generate exhaustive unit tests for the following {self.target_stack} code to ensure 100% test coverage.
        """

        result, _ = await get_completion(
            prompt=migrated_code,
            system_instruction=system_prompt,
            mode="translation",
            use_r1=self.use_r1
        )
        return result

    async def run_pipeline(self, legacy_files: list[dict[str, str]]):
        """Executes the complete modernization pipeline."""
        logger.info("Starting legacy modernization pipeline...")

        graph = await self.analyze_dependencies(legacy_files)
        scaffold = await self.generate_microservice_scaffold(graph)

        # Parallel migration of business logic
        tasks = []
        for file in legacy_files:
            tasks.append(self.migrate_business_logic(file['name'], file['content'], str(scaffold)))

        migrated_files = await asyncio.gather(*tasks)

        # Parallel test generation
        test_tasks = [self.generate_unit_tests(code) for code in migrated_files]
        tests = await asyncio.gather(*test_tasks)

        logger.info("Modernization pipeline complete.")
        return {
            "graph": graph,
            "scaffold": scaffold,
            "migrated_files": migrated_files,
            "tests": tests
        }

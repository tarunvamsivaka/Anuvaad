import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export function useMultiplayer(docId: string) {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [awareness, setAwareness] = useState<any>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    if (!docId) return;

    // Create a new Yjs document
    const ydoc = new Y.Doc();
    setDoc(ydoc);

    // Connect to the WebSocket provider
    // In production, this would point to our backend websocket server or edge worker
    const wsProvider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_YJS_WEBSOCKET_URL || 'wss://demos.yjs.dev', // Fallback for prototype
      `anuvaad-workspace-${docId}`,
      ydoc
    );

    setProvider(wsProvider);
    setAwareness(wsProvider.awareness);

    wsProvider.on('status', (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setStatus(event.status);
    });

    // Cleanup
    return () => {
      wsProvider.disconnect();
      wsProvider.destroy();
      ydoc.destroy();
    };
  }, [docId]);

  return { doc, provider, awareness, status };
}

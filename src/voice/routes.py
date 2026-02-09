"""Voice AI WebSocket proxy routes.

Provides WebSocket proxy endpoints for real-time voice AI APIs that require
server-side authentication (browser WebSockets cannot send Authorization headers).
"""

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets
from websockets.exceptions import ConnectionClosed, InvalidStatusCode
import structlog

from src.admin.store import AdminConfigStore

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice"])

# Grok Voice Agent API endpoint
GROK_REALTIME_URL = "wss://api.x.ai/v1/realtime"


@router.websocket("/grok")
async def grok_voice_proxy(websocket: WebSocket):
    """
    WebSocket proxy for Grok Voice Agent API.
    
    This proxy handles authentication with the xAI API using the configured
    API key, allowing browser clients to connect without exposing credentials.
    
    Architecture:
        Browser <--WebSocket--> FastAPI Proxy <--WebSocket--> xAI Grok API
    
    The proxy forwards all messages bidirectionally between the browser and
    the Grok Voice Agent API.
    """
    await websocket.accept()
    
    # Get API key from admin store
    store = AdminConfigStore()
    voice_keys = store.get_voice_api_keys()
    grok_key = voice_keys.get("api_keys", {}).get("grok")
    
    if not grok_key:
        logger.warning("grok_proxy_no_api_key")
        await websocket.close(code=4001, reason="Grok API key not configured")
        return
    
    logger.info("grok_proxy_connecting", url=GROK_REALTIME_URL)
    
    # Connection headers for Grok API (websockets 16+ uses dict for additional_headers)
    headers = {
        "Authorization": f"Bearer {grok_key}",
    }
    
    grok_ws = None
    
    try:
        # Connect to Grok Voice Agent API using websockets API
        grok_ws = await websockets.connect(
            GROK_REALTIME_URL,
            additional_headers=headers,
            ping_interval=20,
            ping_timeout=20,
        )
        logger.info("grok_proxy_connected")
        
        # Create tasks for bidirectional forwarding
        async def forward_browser_to_grok():
            """Forward messages from browser to Grok API."""
            try:
                while True:
                    data = await websocket.receive_text()
                    await grok_ws.send(data)
            except WebSocketDisconnect:
                logger.info("grok_proxy_browser_disconnected")
            except Exception as e:
                logger.warning("grok_proxy_forward_error", error=str(e))
        
        async def forward_grok_to_browser():
            """Forward messages from Grok API to browser."""
            try:
                async for message in grok_ws:
                    if isinstance(message, bytes):
                        await websocket.send_bytes(message)
                    else:
                        await websocket.send_text(message)
            except ConnectionClosed as e:
                logger.info("grok_proxy_connection_closed", reason=str(e))
            except Exception as e:
                logger.warning("grok_proxy_browser_forward_error", error=str(e))
        
        # Run both forwarding tasks concurrently
        browser_task = asyncio.create_task(forward_browser_to_grok())
        grok_task = asyncio.create_task(forward_grok_to_browser())
        
        # Wait for either task to complete (indicates disconnection)
        done, pending = await asyncio.wait(
            [browser_task, grok_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        
        # Cancel pending tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
    except InvalidStatusCode as e:
        logger.error("grok_proxy_connection_rejected", error=str(e))
        await websocket.close(code=4002, reason=f"Grok API rejected: {e.status_code}")
    except Exception as e:
        logger.error("grok_proxy_error", error=str(e))
        try:
            await websocket.close(code=4003, reason=str(e)[:100])
        except Exception:
            pass
    finally:
        # Clean up Grok connection
        if grok_ws:
            try:
                await grok_ws.close()
            except Exception:
                pass
        logger.info("grok_proxy_connection_closed")


@router.get("/status")
async def voice_status():
    """Check voice provider configuration status."""
    store = AdminConfigStore()
    voice_keys = store.get_voice_api_keys()
    
    return {
        "grok": {
            "configured": bool(voice_keys.get("api_keys", {}).get("grok")),
            "endpoint": "/api/voice/grok",
        },
        "gemini": {
            "configured": bool(voice_keys.get("api_keys", {}).get("gemini")),
            "note": "Gemini connects directly from browser using SDK",
        },
        "openai": {
            "configured": bool(voice_keys.get("api_keys", {}).get("openai")),
            "note": "OpenAI Realtime requires similar proxy (not yet implemented)",
        },
    }


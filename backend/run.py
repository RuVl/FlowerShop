import asyncio
import logging

import uvicorn

from env import ServerKeys

logging_handlers = [logging.StreamHandler()]
if not ServerKeys.DEBUG:
    logging_handlers.append(logging.FileHandler("app.log"))

logging.basicConfig(
    level=logging.INFO if not ServerKeys.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=logging_handlers,
)
logger = logging.getLogger(__name__)


async def main():
    config = uvicorn.Config(
        "api:app",
        host=ServerKeys.SERVER_HOST,
        port=ServerKeys.SERVER_PORT,
        log_level="info",
        proxy_headers=ServerKeys.ALLOW_PROXY,
        forwarded_allow_ips=ServerKeys.ALLOWED_PROXY_IP,
        reload=ServerKeys.DEBUG
    )
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    asyncio.run(main())

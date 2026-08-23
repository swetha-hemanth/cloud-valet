import os

from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient


load_dotenv()


connection_string = os.getenv(
    "AZURE_STORAGE_CONNECTION_STRING"
)

container_name = os.getenv(
    "AZURE_CONTAINER_NAME"
)


if not connection_string:
    print("ERROR: Connection string not found")

elif not container_name:
    print("ERROR: Container name not found")

else:

    try:

        blob_service_client = (
            BlobServiceClient.from_connection_string(
                connection_string
            )
        )

        container_client = (
            blob_service_client.get_container_client(
                container_name
            )
        )

        # Forces a real request to Azure
        container_client.get_container_properties()

        print(
            "SUCCESS: Connected to Azure Blob Storage"
        )

        print(
            "Container:",
            container_name
        )

    except Exception as error:

        print(
            "AZURE CONNECTION ERROR:",
            error
        )
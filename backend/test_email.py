import os
import smtplib

from dotenv import load_dotenv
from email.message import EmailMessage


load_dotenv()


email = os.getenv("SMTP_EMAIL")
password = os.getenv("SMTP_APP_PASSWORD")


print("SMTP EMAIL:", email)

if password:
    clean_password = password.replace(" ", "")
    print("APP PASSWORD LENGTH:", len(clean_password))
else:
    print("APP PASSWORD NOT FOUND")
    clean_password = ""


if not email or not clean_password:
    print("ERROR: SMTP settings missing")
    exit()


message = EmailMessage()

message["Subject"] = "CloudVault OTP Test"

message["From"] = email

message["To"] = email

message.set_content(
    """
CloudVault email system is working.

Test OTP: 123456
"""
)


try:

    with smtplib.SMTP(
        "smtp.gmail.com",
        587
    ) as smtp:

        smtp.ehlo()

        smtp.starttls()

        smtp.ehlo()

        smtp.login(
            email,
            clean_password
        )

        smtp.send_message(
            message
        )


    print("SUCCESS: EMAIL SENT")


except Exception as error:

    print(
        "EMAIL ERROR:",
        error
    )
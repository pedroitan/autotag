from setuptools import setup, find_packages

setup(
    name="imgtagman",
    version="1.0.0",
    description="A tool to manage image tags",
    author="Your Name",
    author_email="your.email@example.com",
    packages=find_packages(include=["imgtagman"]),
    install_requires=[
        "openai",
        # Add other dependencies here
    ],
    entry_points={
        "console_scripts": [
            "imgtagman=imgtagman.imgtagman:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "Operating System :: OS Independent",
    ],
)
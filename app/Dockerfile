# Running python
FROM python:3.12

# Create and set working directory
RUN mkdir /app
WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY . .

# Installations for Python, needed for running sim
RUN apt-get update && apt-get install -y \
  build-essential \
  zlib1g-dev \
  libncurses5-dev \
  libgdbm-dev \
  libnss3-dev \
  libssl-dev \
  libreadline-dev \
  libffi-dev \
  libsqlite3-dev \
  wget \
  libbz2-dev

CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0", "--port=8000" ]
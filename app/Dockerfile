FROM rust:1.84 AS builder

RUN mkdir /app
WORKDIR /app
COPY queries .

RUN cargo clean
RUN cargo build --release

# Running python
FROM python:3.12

# Create and set working directory
RUN mkdir /app
WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY . .

RUN mkdir /queries

COPY --from=builder /app/target/release/sedaro-nano-queries /queries/sedaro-nano-queries

CMD [ "python3", "-m" , "flask", "run", "--debug", "--host=0.0.0.0", "--port=8000" ]
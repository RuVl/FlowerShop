FROM python:3.13.8-slim
LABEL authors="RuVl"

# Set enviroment variables
ENV TZ="Europe/Moscow"
ENV PIP_ROOT_USER_ACTION=ignore

# Prepare project directory
CMD ["mkdir", "-p", "/usr/src/app/"]
WORKDIR /usr/src/app/

# Copy and install requirements
COPY ./requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy project to directory
COPY --from=database ./database ./database
COPY . ./

# Run
ENTRYPOINT ["python3", "run.py"]

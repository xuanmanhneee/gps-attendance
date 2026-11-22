FROM denoland/deno:2.2.0

WORKDIR /app
COPY deno.json ./
COPY src ./src
RUN deno check src/main.ts

USER root
RUN mkdir -p /data && chown deno:deno /data
USER deno

ENV PORT=3100
ENV LMS_DATABASE_PATH=/data/lms.sqlite
EXPOSE 3100
ENTRYPOINT []
CMD ["deno", "task", "start"]

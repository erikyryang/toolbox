# Build estático: o binário final não depende de libc, o que permite uma
# imagem sem sistema de arquivos para explorar.
FROM golang:1.25-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/toolbox-server ./cmd/toolbox-server

# scratch: nem shell, nem gerenciador de pacotes, nem nada que possa gravar.
# O único caminho gravável do container é a tmpfs de spool, montada no deploy.
FROM scratch

COPY --from=build /out/toolbox-server /toolbox-server

# Usuário sem privilégio. Não há /etc/passwd na imagem, e o UID numérico é o
# suficiente para o kernel.
USER 65532:65532

ENV ADDR=":8080" \
    SPOOL_DIR="/spool" \
    REQUEST_MAX_BYTES="536870912" \
    MEM_BUFFER_MAX="67108864" \
    REQUEST_TIMEOUT="120s"

EXPOSE 8080

ENTRYPOINT ["/toolbox-server"]

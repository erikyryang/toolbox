import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone com só o que o servidor precisa — é o que a imagem
  // Docker copia, sem node_modules inteiro.
  output: "standalone",
};

export default nextConfig;

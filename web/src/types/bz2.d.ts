/**
 * O pacote bz2 não traz tipos. Declaramos apenas o que usamos: a
 * descompressão. Não existe compressor BZIP2 mantido para o navegador — a
 * compressão nesse formato é responsabilidade do backend.
 */
declare module "bz2" {
  const bz2: {
    decompress(data: Uint8Array): Uint8Array;
  };
  export default bz2;
}

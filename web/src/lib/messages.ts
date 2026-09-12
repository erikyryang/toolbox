import type { Language } from "./i18n.ts";
import { uiMessages } from "./ui-messages.ts";

// O catálogo inglês define as chaves; o tipo de `pt` obriga a cobrir todas.
export const en = {
  ...uiMessages.en,
  "error.unknown": "The operation failed unexpectedly. Check the input and try again.",
  "error.utf8": "The result is not valid UTF-8 text. For binary content, download the output instead.",
  "error.hexCharacter": "Character {char} is not a hexadecimal digit.",
  "error.hexLength": "The input has {count} hexadecimal digits, an odd number. Each byte needs two digits.",
  "error.base64Padding": "The padding character = can only appear at the end of the input.",
  "error.base64Character": "Character {char} does not belong to the selected Base64 alphabet. Check the alphabet option.",
  "error.base64Incomplete": "The Base64 input is incomplete: one character remains in the last group.",
  "error.base64StandardAlphabet": "Character {char} belongs to the standard Base64 alphabet, not the URL-safe one. Switch the variant in the advanced options.",
  "error.base64UrlSafeAlphabet": "Character {char} belongs to the URL-safe Base64 alphabet, not the standard one. Switch the variant in the advanced options.",
  "error.base32Character": "Character {char} does not belong to the Base32 alphabet (A–Z and 2–7).",
  "error.base58Character": "Character {char} does not belong to the Base58 alphabet. Base58 omits 0, O, I and l.",
  "error.number": "Enter a number such as 1024 or 1.5.",
  "error.numberRange": "The number is outside the supported range.",
  "error.json": "Invalid JSON. Check the syntax.",
  "error.xml": "Invalid XML. Check the syntax.",
  "error.position": "{message} — position {position}.",
  "error.lineColumn": "{message} — line {line}, column {column}.",
  "error.httpTooLarge": "The server rejected the file because it is too large. Try a smaller file.",
  "error.httpBusy": "The server is busy. Try again later.",
  "error.http": "The server could not process the request (HTTP {status}). Try again later.",
  "error.retrySeconds": "{message} Try again in {retryAfter} seconds.",
  "error.retryDate": "{message} Try again after {retryAfter}.",
  "error.noFiles": "Select a file to compress.",
  "error.serverFormat": "{format} requires server processing for this operation.",
  "error.compressMemory": "The browser ran out of memory compressing at level {level}. Use a lower level or a smaller file.",
  "error.archive": "The archive could not be read. Check that it is complete and uses a supported format.",
  "error.entry": "The requested entry does not exist in the archive.",
  "error.signature": "Unknown format. The first bytes are {signature}, which do not match a supported format.",
  "error.encrypted": "Password-protected archives are not supported.",
  "error.outputLimit": "Extraction exceeded the output limit of {limit} and was stopped.",
  "error.expansionLimit": "The archive exceeds the expansion limit of {ratio}× and was stopped.",
  "error.declaredLimit": "The archive declares {size} of extracted data, above the limit of {limit}.",
  "error.tarName": "The name {name} uses {size} bytes and does not fit in the TAR field of {limit} bytes.",
  "error.tarChecksum": "Invalid TAR checksum at offset {offset}. The archive may be corrupted.",
  "error.tarTruncated": "The entry {name} declares {size} bytes, but the TAR archive ends before that.",
  "error.zipDirectory": "The ZIP central directory is missing or truncated.",
  "error.zipShort": "The file is too short to be a ZIP archive.",
  "error.zip64": "The ZIP directory points outside the file. ZIP64 is not supported in the browser.",
  "error.zipHeader": "Invalid ZIP entry header at offset {offset}.",
  "error.pasteEmpty": "Paste the encoded archive contents to continue.",
  "error.pasteLarge": "The pasted text is too large. Save it as a file and use the file picker.",
  "error.pasteEncoding": "The text is not valid Base64 or hexadecimal. Paste the archive encoded in one of those forms.",
  "error.pasteFormat": "Read as {encoding}, producing {size} bytes, but the signature {signature} does not match a supported archive.",
  "error.worker": "The background processor failed. Try again.",
  "error.workerResponse": "Unexpected response from the background processor. Try again.",
  "error.cancelled": "Operation cancelled.",
  "error.backendUnavailable": "This operation requires a server, which is not available. Use a file within the local limit or another format.",
  "note.binaryBase": "Binary base (1024): {units}.",
  "note.decimalBase": "Decimal base (1000): {units} use SI units, not the 1024 steps reported by the operating system.",
  "note.xmlAttributes": "XML attributes became keys prefixed with {prefix}; mixed element text became the {textKey} key.",
  "note.xmlNamespaces": "Namespace declarations became ordinary attributes; namespace semantics are not preserved.",
  "note.xmlRoot": "The top-level value received the root element <{root}> because XML requires a single root element.",
  "note.filesDropped": "{format} compresses one file at a time. Only {name} is still selected.",
  "note.pasted": "Read as {encoding} — {format}, {size}.",
  "note.pastedDataUrl": "Read as {encoding} inside a data: URL — {format}, {size}.",
  "privacy.server": "Processed on the server. The file is discarded as soon as the response ends; nothing is stored.",
  "ui.copyTarget": "Copy {target}",
  "ui.output": "output",
  "ui.pythonScript": "Python script",
  "ui.levelRange": " Level {min}–{max}.",
  "ui.pythonVersion": " — needs Python {version} or newer.",
  "ui.compressedSize": " · compressed {size}",
  "ui.originalPercent": " · {percent}% of original",
  "ui.localLimit": "Up to {limit} runs here. Beyond that, processing moves to the server, without storage.",
  "ui.extractRouting": "ZIP, GZIP, ZSTD, and TAR run locally up to {limit}. RAR and 7Z use the server.",
  "ui.level": "level",
  "ui.of": "of",
  "ui.preset.fast": "Fast",
  "ui.preset.balanced": "Balanced",
  "ui.preset.max": "Maximum",
  "ui.preset.custom": "Custom",
  "ui.compressionLevel": "Compression level",
  "ui.compressionLevelHelp": "Each preset maps to a level within this format's {min}–{max} range.",
  "ui.exactLevel": "Exact level",
};

export type MessageKey = keyof typeof en;
export const pt: Record<MessageKey, string> = {
  ...uiMessages.pt,
  "error.unknown": "A operação falhou inesperadamente. Confira a entrada e tente novamente.",
  "error.utf8": "O resultado não é texto UTF-8 válido. Se o conteúdo for binário, baixe a saída.",
  "error.hexCharacter": "Caractere {char} não é um dígito hexadecimal.",
  "error.hexLength": "A entrada tem {count} dígitos hexadecimais, um número ímpar. Cada byte precisa de dois dígitos.",
  "error.base64Padding": "O caractere de preenchimento = só pode aparecer no fim da entrada.",
  "error.base64Character": "Caractere {char} não pertence ao alfabeto Base64 selecionado. Confira a opção de alfabeto.",
  "error.base64Incomplete": "A entrada Base64 está incompleta: sobrou um caractere no último grupo.",
  "error.base64StandardAlphabet": "Caractere {char} pertence ao alfabeto Base64 padrão, não ao URL-safe. Troque a variante nas opções avançadas.",
  "error.base64UrlSafeAlphabet": "Caractere {char} pertence ao alfabeto Base64 URL-safe, não ao padrão. Troque a variante nas opções avançadas.",
  "error.base32Character": "Caractere {char} não pertence ao alfabeto Base32 (A–Z e 2–7).",
  "error.base58Character": "Caractere {char} não pertence ao alfabeto Base58. Base58 omite 0, O, I e l.",
  "error.number": "Informe um número como 1024 ou 1.5.",
  "error.numberRange": "O número está fora da faixa suportada.",
  "error.json": "JSON inválido. Confira a sintaxe.",
  "error.xml": "XML inválido. Confira a sintaxe.",
  "error.position": "{message} — posição {position}.",
  "error.lineColumn": "{message} — linha {line}, coluna {column}.",
  "error.httpTooLarge": "O servidor recusou o arquivo por ser grande demais. Tente um arquivo menor.",
  "error.httpBusy": "O servidor está ocupado. Tente novamente mais tarde.",
  "error.http": "O servidor não conseguiu processar a solicitação (HTTP {status}). Tente novamente mais tarde.",
  "error.retrySeconds": "{message} Tente novamente em {retryAfter} segundos.",
  "error.retryDate": "{message} Tente novamente após {retryAfter}.",
  "error.noFiles": "Selecione um arquivo para compactar.",
  "error.serverFormat": "{format} exige processamento no servidor para esta operação.",
  "error.compressMemory": "O navegador ficou sem memória ao compactar no nível {level}. Use um nível menor ou um arquivo menor.",
  "error.archive": "Não foi possível ler o arquivo. Confira se está completo e usa um formato suportado.",
  "error.entry": "A entrada pedida não existe no arquivo.",
  "error.signature": "Formato não identificado. Os primeiros bytes são {signature}, que não correspondem a um formato suportado.",
  "error.encrypted": "Arquivos protegidos por senha não são suportados.",
  "error.outputLimit": "A extração passou do limite de saída de {limit} e foi interrompida.",
  "error.expansionLimit": "O arquivo excede o limite de expansão de {ratio}× e foi interrompido.",
  "error.declaredLimit": "O arquivo declara {size} de conteúdo extraído, acima do limite de {limit}.",
  "error.tarName": "O nome {name} usa {size} bytes e não cabe no campo TAR de {limit} bytes.",
  "error.tarChecksum": "Checksum TAR inválido no deslocamento {offset}. O arquivo pode estar corrompido.",
  "error.tarTruncated": "A entrada {name} declara {size} bytes, mas o arquivo TAR termina antes disso.",
  "error.zipDirectory": "O diretório central do ZIP está ausente ou truncado.",
  "error.zipShort": "O arquivo é curto demais para ser um ZIP.",
  "error.zip64": "O diretório ZIP aponta para fora do arquivo. ZIP64 não é suportado no navegador.",
  "error.zipHeader": "Cabeçalho de entrada ZIP inválido no deslocamento {offset}.",
  "error.pasteEmpty": "Cole o conteúdo codificado do arquivo para continuar.",
  "error.pasteLarge": "O texto colado é grande demais. Salve-o como arquivo e use o seletor.",
  "error.pasteEncoding": "O texto não é Base64 nem hexadecimal válido. Cole o arquivo codificado em uma dessas formas.",
  "error.pasteFormat": "Lido como {encoding}, produzindo {size} bytes, mas a assinatura {signature} não corresponde a um arquivo suportado.",
  "error.worker": "O processador em segundo plano falhou. Tente novamente.",
  "error.workerResponse": "Resposta inesperada do processador em segundo plano. Tente novamente.",
  "error.cancelled": "Operação cancelada.",
  "error.backendUnavailable": "Esta operação precisa de um servidor, que não está disponível. Use um arquivo dentro do limite local ou outro formato.",
  "note.binaryBase": "Base binária (1024): {units}.",
  "note.decimalBase": "Base decimal (1000): {units} no sentido SI, e não os degraus de 1024 que o sistema operacional reporta.",
  "note.xmlAttributes": "Atributos XML viraram chaves com o prefixo {prefix}; texto de elemento misto virou a chave {textKey}.",
  "note.xmlNamespaces": "Declarações de namespace viraram atributos comuns; a semântica de namespace não é preservada.",
  "note.xmlRoot": "O valor no topo recebeu o elemento raiz <{root}>, pois XML exige um único elemento raiz.",
  "note.filesDropped": "{format} compacta um arquivo por vez. Só {name} continua selecionado.",
  "note.pasted": "Lido como {encoding} — {format}, {size}.",
  "note.pastedDataUrl": "Lido como {encoding} dentro de um data: URL — {format}, {size}.",
  "privacy.server": "Processado no servidor. O arquivo é descartado assim que a resposta termina; nada é armazenado.",
  "ui.copyTarget": "Copiar {target}",
  "ui.output": "saída",
  "ui.pythonScript": "script Python",
  "ui.levelRange": " Nível {min}–{max}.",
  "ui.pythonVersion": " — precisa do Python {version} ou mais novo.",
  "ui.compressedSize": " · comprimido {size}",
  "ui.originalPercent": " · {percent}% do original",
  "ui.localLimit": "Até {limit} roda aqui. Acima disso, o processamento vai para o servidor, sem armazenamento.",
  "ui.extractRouting": "ZIP, GZIP, ZSTD e TAR rodam localmente até {limit}. RAR e 7Z usam o servidor.",
  "ui.level": "nível",
  "ui.of": "de",
  "ui.preset.fast": "Rápido",
  "ui.preset.balanced": "Equilibrado",
  "ui.preset.max": "Máximo",
  "ui.preset.custom": "Customizado",
  "ui.compressionLevel": "Nível de compressão",
  "ui.compressionLevelHelp": "Cada preset vira um nível dentro do range {min}–{max} deste formato.",
  "ui.exactLevel": "Nível exato",
};

export type MessageParams = Readonly<Record<string, string | number>>;
export type Feedback = { code: MessageKey; params?: MessageParams; position?: number };

/**
 * A substituição devolve texto puro: o que entra por parâmetro nunca é lido
 * de novo como marcador, e um parâmetro que falta fica visível em vez de
 * apagar o trecho.
 */
export function message(language: Language, key: MessageKey, params: MessageParams = {}): string {
  return (language === "pt" ? pt : en)[key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    params[name] === undefined ? placeholder : String(params[name]));
}

export function feedbackOf(error: unknown): Feedback {
  if (error && typeof error === "object" && "feedback" in error) {
    const value = error.feedback;
    if (value && typeof value === "object" && "code" in value && typeof value.code === "string" && Object.hasOwn(en, value.code)) {
      return value as Feedback;
    }
  }
  return { code: "error.unknown" };
}

export function localizeFeedback(feedback: Feedback | undefined, language: Language): string {
  const current = feedback ?? { code: "error.unknown" };
  let text = message(language, current.code, current.params);
  if (current.params?.line !== undefined && current.params?.column !== undefined) {
    text = message(language, "error.lineColumn", { message: text, line: current.params.line, column: current.params.column });
  } else if (current.position !== undefined) {
    text = message(language, "error.position", { message: text, position: current.position });
  }
  const retryAfter = current.params?.retryAfter;
  if (retryAfter !== undefined) {
    text = message(language, /^\d+$/.test(String(retryAfter)) ? "error.retrySeconds" : "error.retryDate", { message: text, retryAfter });
  }
  return text;
}

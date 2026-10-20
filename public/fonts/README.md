# Fontes

Servidas do próprio repo para o build não depender de baixar do Google (NEU-176).

São os mesmos arquivos que o `next/font/google` baixava (Next 16.2.9, `subsets: ["latin"]`): fontes variáveis do Google Fonts, uma por subconjunto de caracteres. As regras `@font-face` estão em `app/fonts.css`.

| Família | Uso | Pesos | Subconjuntos |
|---|---|---|---|
| Space Grotesk | `font-display` | 500, 600, 700 | latin, latin-ext, vietnamese |
| Inter | `font-sans` | 100 a 900 | latin, latin-ext, vietnamese, cyrillic, cyrillic-ext, greek, greek-ext |
| JetBrains Mono | `font-mono` | 500, 700 | latin, latin-ext, vietnamese, cyrillic, cyrillic-ext, greek |

Licença: SIL Open Font License 1.1, em `OFL.txt`.

`/fonts/*` sai com cache imutável (`next.config.ts`). Ao trocar um arquivo, troque também o nome.

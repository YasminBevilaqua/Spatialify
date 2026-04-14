# Spatialify 🎧

Extensão Firefox para aprimorar a experiência de áudio do YouTube Music com **expansão estéreo focada** usando Web Audio API.

## ✨ Funcionalidades (Stereo Widening Puro)

- **↔️ Largura Estéreo** - Controla a abertura entre canais esquerdo e direito
- **⏱ Efeito Haas** - Micro-delays (8-15ms) entre canais para percepção espacial
- **〰️ Inversão de Fase** - Sutil inversão de fase para aumentar a separação
- **📢 Compensação de Ganho** - Ajuste fino para compensar perdas de fase
- **🎛 Presets** - Sutil, Amplo, Ultra

## 🎯 Foco

Diferente de outras extensões, o Spatialify **não usa reverb, não simula 3D, não tem auto-pan**. O objetivo é simples: criar a sensação de que o som vem dos dois lados, reduzindo o áudio centralizado, de forma **natural e limpa**.

## 📁 Estrutura

```
extension/
├── manifest.json      # Manifest V3 (Firefox)
├── content.js         # Processamento de áudio Web Audio API
├── popup.html         # Interface popup compacta
├── popup.js           # Lógica do popup
├── options.html       # Painel de configurações avançadas
├── options.js         # Lógica das opções
├── styles.css         # Estilos compartilhados
├── icon48.png         # Ícone 48px
└── icon96.png         # Ícone 96px
```

## 🚀 Instalação

1. Abra o Firefox e navegue para `about:debugging#/runtime/this-firefox`
2. Clique em "Este Firefox" → "Carregar extensão temporária"
3. Selecione o arquivo `extension/manifest.json`
4. A extensão será carregada e estará ativa em music.youtube.com

## 🎨 Design

- **Tema escuro** com fundo `#0a0a14`
- **Glassmorphism** com blur e transparência
- **Gradientes** sutis em roxo e turquesa
- **Animações** suaves em interações
- **UI moderna** sem frameworks externos

## 🔧 Tecnologias

- HTML5/CSS3/JavaScript vanilla
- Web Audio API
- WebExtension API (Manifest V3)
- Zero dependências externas
- Zero build steps

## 📄 Licença

MIT 

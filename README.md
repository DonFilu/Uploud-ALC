# Upload ALC

Upload de vídeo original para ImageKit, link compartilhável, download original e exclusão manual pelo botão **Já baixei**.

## Railway
Configure `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_URL_ENDPOINT`, `APP_PASSWORD` e `NODE_ENV=production`. Inicie com `npm start`.

## Limitações da versão inicial
Os links ficam apenas na memória do servidor: reiniciar ou publicar novo deploy perde os registros, embora os arquivos continuem no ImageKit. Antes de uso real, é necessário adicionar persistência (por exemplo MongoDB) e proteção para impedir registro de arquivos arbitrários. Links diretos do ImageKit previamente copiados podem continuar acessíveis em cache. O tamanho máximo depende do plano do ImageKit.

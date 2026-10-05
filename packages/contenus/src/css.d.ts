// Feuilles CSS importées comme texte (esbuild : loader « text ») : dessins.css du core, posée dans la page du kit.
declare module '*.css' {
  const texte: string;
  export default texte;
}

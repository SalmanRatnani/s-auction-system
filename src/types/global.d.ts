// src/types/global.d.ts
// Ambient declarations so TypeScript accepts CSS and asset imports.

declare module "*.css";
declare module "*.scss";
declare module "*.sass";

declare module "*.png" {
  const value: string;
  export default value;
}
declare module "*.jpg" {
  const value: string;
  export default value;
}
declare module "*.jpeg" {
  const value: string;
  export default value;
}
declare module "*.svg" {
  const value: string;
  export default value;
}
declare module "*.gif" {
  const value: string;
  export default value;
}
declare module "*.webp" {
  const value: string;
  export default value;
}
declare module "*.mp3" {
  const value: string;
  export default value;
}
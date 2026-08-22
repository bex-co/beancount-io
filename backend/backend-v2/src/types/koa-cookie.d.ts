declare module "koa-cookie" {
  import { Middleware } from "koa";

  function cookie(): Middleware;

  export = cookie;
}

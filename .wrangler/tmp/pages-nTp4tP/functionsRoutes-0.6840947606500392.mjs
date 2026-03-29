import { onRequestGet as __api_puzzle_js_onRequestGet } from "C:\\Users\\benrn\\Desktop\\Clicky-Game\\functions\\api\\puzzle.js"
import { onRequestGet as __api_puzzles_js_onRequestGet } from "C:\\Users\\benrn\\Desktop\\Clicky-Game\\functions\\api\\puzzles.js"
import { onRequestPost as __api_rate_js_onRequestPost } from "C:\\Users\\benrn\\Desktop\\Clicky-Game\\functions\\api\\rate.js"
import { onRequestPost as __api_upload_js_onRequestPost } from "C:\\Users\\benrn\\Desktop\\Clicky-Game\\functions\\api\\upload.js"

export const routes = [
    {
      routePath: "/api/puzzle",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_puzzle_js_onRequestGet],
    },
  {
      routePath: "/api/puzzles",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_puzzles_js_onRequestGet],
    },
  {
      routePath: "/api/rate",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_rate_js_onRequestPost],
    },
  {
      routePath: "/api/upload",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_upload_js_onRequestPost],
    },
  ]
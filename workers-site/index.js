import { getAssetFromKV, mapRequestToAsset } from "@cloudflare/kv-asset-handler"
import siteEditor from "site-editor"

const DEBUG = false

addEventListener("fetch", event => {
  try {
    event.respondWith(handleEvent(event))
  } catch (error) {
    if (DEBUG) {
      return event.respondWith(
        new Response(error.message || error.toString(), {
          status: 500
        })
      )
    }
    event.respondWith(new Response("Internal error", { status: 500 }))
  }
})

async function handleEvent(event) {
  const url = new URL(event.request.url)

  try {
    const siteEditorResponse = await siteEditor(event)
    if (siteEditorResponse) return siteEditorResponse

    const page = await getAssetFromKV(event, {
      bypassCache: DEBUG
    })

    const response = new Response(page.body, page)
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("Referrer-Policy", "unsafe-url")

    // Temporarilly disable editing for security
    // return siteEditor(false, response, { allowEditing: true })
    return siteEditor(false, response, { allowEditing: false })

  } catch (error) {
    if (DEBUG) {
      return new Response(error.message || error.toString(), { status: 500 })

    } else {
      try {
        const notFoundResponse = await getAssetFromKV(event, {
          mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/404.html`, req)
        })

        return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 })
      } catch (error) {}
    }
  }
}

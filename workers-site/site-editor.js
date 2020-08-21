import clientJS from "./client"

const contentTypes = {
  json: "application/json; charset=utf-8",
  js: "application/javascript; charset=utf-8"
}

const defaults = {
  basePath: "/_site-editor",
  attr: "data-editable"
}

const successJSONResponse = () => {
  return new Response(JSON.stringify({
    "success": true
  }), {
    headers: {
      "content-type": contentTypes.json
    }
  })
}

const getItemsFromKV = async () => {
  let keys = []
  let { cursor, keys: kv_keys, list_complete } = await EDITABLES.list()
  keys = [].concat(keys, kv_keys.map(k => k.name))

  while (!list_complete) {
    let request = await EDITABLES.list({ cursor: cursor })
    keys = [].concat(keys, request.keys.map(k => k.name))
    cursor = request.cursor
    list_complete = request.list_complete
  }

  return await Promise.all(
    keys.map(async key => {
      const value = await EDITABLES.get(key)
      return Promise.resolve([key, value])
    })
  )
}

const applySiteEditorTransformations = async (response, settings) => {
  const map = {}
  const items = await getItemsFromKV()
  items.forEach(([key, value]) => {
    map[key] = value
  })

  const rewriter = new HTMLRewriter()

  rewriter
    .on(`[${settings.attr}]`, {
      element(element) {
        const key = element.getAttribute(settings.attr)
        const value = map[key]
        if (!value) return
        element.setInnerContent(value, { html: true })
      }
    })
    .on("body", {
      element(element) {
        element.append(`
          <script src="https://cdnjs.cloudflare.com/ajax/libs/tinymce/5.4.2/tinymce.min.js" referrerpolicy="origin"></script>
          <script src="${settings.basePath}/client-js"></script>
        `, { html: true })
      }
    })

  return rewriter.transform(response)
}

const siteEditorInternalResponse = async (event, settings) => {
  const { request } = event
  const url = new URL(event.request.url)

  try {
    switch (url.pathname) {
      case `${settings.basePath}/client-js`:
        return new Response(clientJS(settings), {
          headers: {
            "content-type": contentTypes.js
          }
        })
      break
      case `${settings.basePath}/update`:
        const data = await request.json()

        await EDITABLES.put(data.key, data.value)
        return successJSONResponse()
      break
    }
  } catch (error) {
    return new Response(error.toString())
  }
}

export default async (event, response, options = {}) => {
  const settings = Object.assign({}, defaults, options)

  if (event) {
    return siteEditorInternalResponse(event, settings)
  }

  return applySiteEditorTransformations(response, settings)
}

export default settings => `;(() => {
  const updateKV = async (key, value) => {
    const response = await fetch("${settings.basePath}/update", {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ key, value })
    })

    return response.json()
  }

  const tinyMCEBaseConfig = {
    menubar: false,
    inline: true,
    toolbar: false
  }

  const tinyMCEHeaderConfig = Object.assign({}, tinyMCEBaseConfig, {
    plugins: ["quickbars", "link"],
    quickbars_selection_toolbar: "italic quicklink"
  })

  const tinyMCEBodyConfig = Object.assign({}, tinyMCEBaseConfig, {
    plugins: ["autolink", "codesample", "link", "lists", "media", "table", "image", "quickbars", "codesample", "help"],
    quickbars_insert_toolbar: "h1 h2 h3 | quickimage | numlist bullist",
    block_formats: "Paragraph=p; Main header=h1; Secondary header=h2; Tertiary header=h3",
    quickbars_selection_toolbar: "formatselect | quicklink | bold italic | numlist bullist blockquote | removeformat",
    contextmenu: "undo redo | inserttable | cell row column deletetable | help"
  })

  document.querySelectorAll("[data-editable]").forEach(el => {
    const key = el.getAttribute("data-editable")

    el.addEventListener("click", () => {
      tinymce.init(Object.assign({}, (el.tagName === "H1" ?
        tinyMCEHeaderConfig : tinyMCEBodyConfig
      ), {
        target: el,
        setup: function(editor) {
          editor.on("init", function() {
            editor.focus()
            editor.selection.select(editor.getBody(), true)
            editor.selection.collapse(false)

            editor.on("blur", () => {
              editor.destroy()

              updateKV(key, el.innerHTML)
                .then(data => {
                  if (data.success) {
                    // TODO: show success
                  }
                })
            })
          })
        }
      }))
    })
  })
})();`
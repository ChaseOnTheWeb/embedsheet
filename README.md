# EmbedSheet

Embed a spreadsheet into your webpage. Somewhat lightweight and progressively
enhanced. Built with [SheetJS Community Edition](https://github.com/SheetJS/js-xlsx)
and [Loki](https://github.com/techfort/LokiJS) for efficient in-memory querying.

Needs a bit of work; contributions welcome.

## Use

Start by making a hyperlink to the spreadsheet you wish to embed. Progressive
enhacement is enforced; if the browser isn't capable of using this library, the
user can click the link to download and view in a native application.

    <a href="spreadsheet.xlsx">My spreadsheet</a>

Then, add the required scripts, and an attribute

    <html>
      <head>
        <meta charset="UTF-8">
        <title>Sample</title>
        <!-- Basic polyfills for IE and older browsers -->
        <script src="https://cdn.polyfill.io/v2/polyfill.min.js?features=default,fetch"></script>
        <script src="https://unpkg.com/xlsx/dist/shim.min.js"></script>
        <!-- The actual library, with dependencies built in -->
        <script src="embedsheet.js"></script>
      </head>
      <body>
        <a href="spreadsheet.xlsx" data-embed-type="sheet">My spreadsheet</a>
      </body>
    </html>



## Roadmap



## Contributing

Contributions to this project are welcomed.

https://www.huduser.gov/portal/datasets/hads/hads.html
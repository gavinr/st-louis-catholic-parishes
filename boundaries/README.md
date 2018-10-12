# Parish Boundaries (Polygons)

## To Update:
1. Download KML file: https://www.archstl.org/Portals/0/maps/parish/parish-map-overlay.kmz
2. Run tool: KML to Feature Class
3. In feature class, create 2 new fields, "Address" and "URL"
4. Field Calculate `Address`:
    ```
    def c(inputString):
        parts = inputString.split('<address>')
        parts2 = parts[1].split('</address>')
        return parts2[0]
    ```

5. Field Calculate `URL` similarly.
    ```
    def c(inputString):
        parts = inputString.split('href="')
        parts2 = parts[1].split('">')
        return parts2[0]
    ```

6. Field Calculate `Address` to clean up:
    ```
    def c(inputString):
        return inputString.replace('<br>', ', ')
    ```
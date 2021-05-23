/*
  This file should store page that should be rendered based on Mime

  Keys of `mapMimeToView` must be Valid mime in format:
  <MIME_TYPE><SEPARATOR><MIME_SUBTYPE>

  Values of `mapMimeToView` must be page that must be rendered
*/

module.exports = {
  mapMimeToView: (mimeType) => {
    switch(mimeType) {
      case 'application/pdf':
        return 'media/pdf';
    }
  }
}

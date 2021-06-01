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
      case (mimeType.match(/video\/quicktime|mp4/) || {}).input:
        return 'media/video';
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return 'media/gviewer';
      case (mimeType.match(/image\/gif|jpeg|png|webp/) || {}).input:
        return 'media/image';
      default:
        return 'media/unknown';
    }
  }
}

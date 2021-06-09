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
      case 'video/mp4':
        return 'media/video';
      case (mimeType.match(/application\/doc|ms-doc|msword|ms-powerpoint/) || {}).input:
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'media/gviewer';
      case (mimeType.match(/image\/gif|jpeg|png|webp/) || {}).input:
        return 'media/image';
      default:
        return 'media/unknown';
    }
  }
}

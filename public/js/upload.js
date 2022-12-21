function uploadFile(file, url) {

    var fd = new FormData();


    fd.append("file", file);
    fd.append('Content-Type', 'video/mp4');

    window.xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", uploadProgressFN, false);
    xhr.addEventListener("load", uploadComplete, false);
    xhr.addEventListener("error", uploadFailed, false);
    xhr.addEventListener("abort", uploadCanceled, false);

    xhr.open('PUT', url, true); //MUST BE LAST LINE BEFORE YOU SEND

    $('[disabled]').removeAttr("disabled")

    xhr.setRequestHeader("Content-Type", "video/mp4")
    uploadProgress.show();
    $('.dropzone').attr("disabled", "disabled");
    $('#tags').tagsinput({
        maxTags: 25
    });
    $('.dropzone').remove();

    xhr.send(file);
}

function uploadFileIpfs(file, url, video) {
    var fd = new FormData();

    fd.append("file", file)
    fd.append('video', JSON.stringify(video))

    $('[disabled]').removeAttr("disabled")

    $.ajax({
        url,
        type: "POST",
        data: fd,
        cache: false,
        contentType: false,
        processData: false,
        xhr: function () {
            var xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener("progress", uploadProgressFN, false);
            xhr.addEventListener("load", uploadComplete, false);
            xhr.addEventListener("error", uploadFailed, false);
            xhr.addEventListener("abort", uploadCanceled, false);
            uploadProgress.show();
            $('.dropzone').attr("disabled", "disabled");
            $('#tags').tagsinput({
                maxTags: 25
            });
            $('.dropzone').remove();
            return xhr;
        }
    })

    /*var fd = new FormData();

    $('[disabled]').removeAttr("disabled")

    fd.append("file", file);
    //fd.append('Content-Type', 'video/mp4');

    window.xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", uploadProgressFN, false);
    xhr.addEventListener("load", uploadComplete, false);
    xhr.addEventListener("error", uploadFailed, false);
    xhr.addEventListener("abort", uploadCanceled, false);

    xhr.open('POST', url, true); //MUST BE LAST LINE BEFORE YOU SEND

    xhr.setRequestHeader("Content-Type","multipart/form-data;")
    uploadProgress.show();
    $('.dropzone').attr("disabled","disabled");
    $('#tags').tagsinput({
        maxTags: 25
    });
    $('.dropzone').remove();

    xhr.send(fd);*/
}

function uploadIpfsResumable(file, url, video) {
    
    $('[disabled]').removeAttr("disabled")

    $('.dropzone').attr("disabled", "disabled");
    $('#tags').tagsinput({
        maxTags: 25
    });
    $('.dropzone').remove();
    uploadProgress.show();
    var upload = new tus.Upload(file, {
        // Endpoint is the upload creation URL from your tus server
        endpoint: url,
        // Retry delays will enable tus-js-client to automatically retry on errors
        retryDelays: [0, 3000, 5000, 10000, 20000],
        // Attach additional meta data about the file for the server
        metadata: {
            filename: file.name,
            filetype: file.type,
            video_id: video._id
        },
        // Callback for errors which cannot be fixed using retries
        onError: function (error) {
            console.log("Failed because: " + error)
            uploadFailed()
        },
        // Callback for reporting upload progress
        onProgress: function (bytesUploaded, bytesTotal) {
            console.log(bytesUploaded, bytesTotal)
            var percentage = Number((bytesUploaded / bytesTotal * 100).toFixed(2))
            console.log(percentage)
            uploadProgress.setLabel("Uploading");
            uploadProgress.setProgress(percentage)
        },
        // Callback for once the upload is completed
        onSuccess: function () {
            console.log("Download %s from %s", upload.file.name, upload.url)
            uploadComplete()
        }
    })
    upload.start()
}


function uploadProgressFN(evt) {
    if (evt.lengthComputable) {
        var percentComplete = Math.round(evt.loaded * 100 / evt.total);
        uploadProgress.setLabel("Uploading");
        uploadProgress.setProgress(percentComplete)
    }
    else {
        console.log("I DONT KNOW")
    }
}

function uploadComplete(evt) {
    console.log(evt)
    /*if (window.upload_type === "ipfs") {
        const data = JSON.parse(evt.target.response)
        console.log(data)
        if (data.status === "FAIL") {
            uploadProgress.setLabel("Something went wrong.")
            uploadProgress.setStatus("danger")
            uploadProgress.show();
            return;
        }
    }*/
    /* This event is raised when the server send back a response */
    uploadProgress.setLabel("Video Uploaded");
    uploadProgress.setStatus("success");

    $('#save').removeAttr("disabled")
    window.uploaded = true;
    redirectIfDone()
    toastr["success"]("Upload completed. Video will be encoded and published once this is done. Your video is now queued for encoding. This normally takes about 5-20 mins, if it’s much longer than that it may be that your internet connection failed")
}

function uploadFailed(evt) {
    uploadProgress.setLabel("Video Failed To Upload");
    uploadProgress.setStatus("danger");
    toastr["error"]("The video upload failed due to an unstable internet connection from the content creator.")
}

function uploadCanceled(evt) {
    uploadProgress.setLabel("Video Upload Aborted By User");
    uploadProgress.setStatus("warning");
}

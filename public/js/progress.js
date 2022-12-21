class PGB {
    constructor(id, inner_id, autoReveal) {
        this.outer = $('#' + id);
        this.inner = $('#' + inner_id);
        this.label = "0%";
        this.onInnerChangeCB = null;
        if (autoReveal === true) {
            this.show();
        }
    }

    hide() {
        this.outer.addClass("d-none");
    }

    show() {
        this.outer.removeClass("d-none");
    }

    setProgress(progress) {
        this.inner.data("progress", progress.toFixed(2));
        this.inner.css("width", progress.toFixed(2) + "%")
        if (typeof this.onInnerChangeCB === "function") {
            this.onInnerChangeCB(this);
        }
    }

    getProgress() {
        return parseFloat(this.inner.data("progress"))
    }

    setLabelColor() {
        let length = this.inner.text().length;
        let progress = parseFloat(this.inner.data("progress"));
        let px_per_letter = 0.3699999;
        if (progress / px_per_letter < length) {
            this.inner.removeClass("text-light").addClass("text-dark")
        } else {
            this.inner.removeClass("text-dark").addClass("text-light")
        }

    }

    setLabel(text, prepend_progress, append_progress) {
        this.label = text;
        if (prepend_progress) {
            return this.inner.text("(" + this.getProgress() + "%) " + text)
        }
        if (append_progress) {
            return this.inner.text(text + " (" + this.getProgress() + "%)")
        }

        this.inner.text(text)
        if (typeof this.onInnerChangeCB === "function") {
            this.onInnerChangeCB(this);
        }

    }

    getLabel() {
        return this.label;
    }


    removeAllStatusColours() {
        this.inner.removeClass("bg-success").removeClass("bg-info").removeClass("bg-warning").removeClass("bg-danger");
    }

    setStatus(status) {
        this.removeAllStatusColours();
        this.inner.addClass("bg-" + status)
        if (typeof this.onInnerChangeCB === "function") {
            this.onInnerChangeCB(this);
        }
    }

    onInnerChange(cb) {
        this.onInnerChangeCB = cb;
    }
}
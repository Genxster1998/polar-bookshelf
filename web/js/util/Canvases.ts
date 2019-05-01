/**
 * Functions for working with canvas objects, extracting screenshots, etc.
 */
import {ArrayBuffers} from './ArrayBuffers';
import {ILTRect} from './rects/ILTRect';
import {ImageType, ExtractedImage} from '../screenshots/Screenshot';
import {Preconditions} from '../Preconditions';

const IMAGE_TYPE = 'image/png';
const IMAGE_QUALITY = 1.0;

export class Canvases {

    // https://github.com/burtonator/pdf-annotation-exporter/blob/master/webapp/js/pdf-loader.js
    // https://github.com/burtonator/pdf-annotation-exporter/blob/master/webapp/js/extractor.js
    // https://github.com/burtonator/pdf-annotation-exporter/blob/master/webapp/js/debug-canvas.js

    /**
     * Take a canvas or an ArrayBuffer and convert it to a data URL without
     * limitations on the size of the URL.
     */
    public static async toDataURL(data: HTMLCanvasElement | ArrayBuffer,
                                  opts: ImageOpts = new DefaultImageOpts()): Promise<string> {

        // https://developer.mozilla.org/en-US/docs/Web/API/Blob

        const toArrayBuffer = async (): Promise<ArrayBuffer> => {

            if (data instanceof HTMLCanvasElement) {
                return await this.toArrayBuffer(data, opts);
            }

            return data;

        };

        const ab = await toArrayBuffer();

        const encoded = ArrayBuffers.toBase64(ab);

        return `data:${IMAGE_TYPE};base64,` + encoded;

    }

    public static toArrayBuffer(canvas: HTMLCanvasElement,
                                opts: ImageOpts = new DefaultImageOpts()): Promise<ArrayBuffer> {

        // https://developer.mozilla.org/en-US/docs/Web/API/Blob
        //
        return new Promise((resolve, reject) => {

            canvas.toBlob((blob) => {

                if (blob) {

                    const reader = new FileReader();

                    reader.addEventListener("onloadstart", (err) => {
                        reject(err);
                    });

                    reader.addEventListener("loadend", () => {
                        const ab = <ArrayBuffer> reader.result;
                        resolve(ab);
                    });

                    reader.addEventListener("onerror", (err) => {
                        reject(err);
                    });

                    reader.addEventListener("onabort", (err) => {
                        reject(err);
                    });

                    reader.readAsArrayBuffer(blob);

                } else {
                    reject(new Error("No blob"));
                }

            }, opts.type, opts.quality);

        });

    }

    public static async crop(data: DataURL | HTMLImageElement,
                             rect: ILTRect,
                             opts: ImageOpts = new DefaultImageOpts()): Promise<ExtractedImage> {

        const createSRC = () => {

            if (data instanceof HTMLImageElement) {
                return data;
            }

            const img = document.createElement("img");
            img.src = data;

            return img;

        };


        const src = createSRC();

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext('2d', {alpha: false})!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(src, 0, 0);

        return await this.extract(canvas, rect, opts );

    }

    /**
     * Extract image data from the given canvas directly and return it as an
     * array buffer.
     * @param canvas The canvas we should extract with.
     * @param rect The rect within the given canvas
     * @param opts The options for the image extraction
     */
    public static async extract(canvas: HTMLCanvasElement,
                                rect: ILTRect,
                                opts: ImageOpts = new DefaultImageOpts()): Promise<ExtractedImage> {

        Preconditions.assertPresent(canvas, "canvas");

        const tmpCanvas = document.createElement("canvas");

        const tmpCanvasCtx = tmpCanvas.getContext('2d', {alpha: false})!;
        tmpCanvasCtx.imageSmoothingEnabled = false;

        tmpCanvas.width  = rect.width;
        tmpCanvas.height = rect.height;

        // copy data from the source canvas to the target
        tmpCanvasCtx.drawImage(canvas,
                               rect.left, rect.top, rect.width, rect.height,
                               0, 0, rect.width, rect.height);

        const data = await this.toArrayBuffer(tmpCanvas, opts);

        return {data, width: rect.width, height: rect.height, type: opts.type};

    }

}

export type DataURL = string;

interface ImageOpts {
    readonly type: ImageType;
    readonly quality: number;

}

class DefaultImageOpts implements ImageOpts {
    public readonly type = IMAGE_TYPE;
    public readonly quality = IMAGE_QUALITY;
}

import {
    AnnotationBarCallbacks,
    ControlledAnnotationBar
} from './ControlledAnnotationBar';
import * as React from 'react';
import {
    ActiveSelectionEvent,
    ActiveSelections
} from '../popup/ActiveSelections';
import {ControlledPopupProps} from '../popup/ControlledPopup';
import * as ReactDOM from 'react-dom';
import {Point} from '../../Point';
import {Optional} from 'polar-shared/src/util/ts/Optional';
import {Points} from '../../Points';
import {DocFormatFactory} from '../../docformat/DocFormatFactory';
import {HighlightCreatedEvent} from '../../comments/react/HighlightCreatedEvent';
import {Reducers} from "polar-shared/src/util/Reducers";
import {Elements} from "../../util/Elements";

export interface RegisterOpts {
    readonly mode: 'viewer' | 'web';
}

export class ControlledAnnotationBars {

    public static create(controlledPopupProps: ControlledPopupProps,
                         annotationBarCallbacks: AnnotationBarCallbacks) {

        this.registerEventListener(annotationBarCallbacks);

    }

    private static registerEventListener(annotationBarCallbacks: AnnotationBarCallbacks,
                                         opts: RegisterOpts = {mode: 'viewer'}) {

        const handleTarget = (target: HTMLElement) => {

            let annotationBar: HTMLElement | undefined;

            interface AnnotationPageInfo {
                readonly pageNum: number;
                readonly pageElement: HTMLElement;
            }

            ActiveSelections.addEventListener(activeSelectionEvent => {

                const computeAnnotationPageInfo = (): AnnotationPageInfo | undefined => {

                    const computeForViewer = (): AnnotationPageInfo | undefined => {

                        const pageElement = Elements.untilRoot(activeSelectionEvent.element, ".page");

                        if (! pageElement) {
                            // log.warn("Not found within .page element");
                            return undefined;
                        }

                        const pageNum = parseInt(pageElement.getAttribute("data-page-number"), 10);

                        return {pageElement, pageNum};

                    };

                    const computeForWeb = (): AnnotationPageInfo | undefined => {
                        return {pageElement: target, pageNum: 1};
                    };

                    switch (opts.mode) {
                        case "viewer":
                            return computeForViewer();

                        case "web":
                            return computeForWeb();
                    }

                };

                const annotationPageInfo = computeAnnotationPageInfo();

                if (! annotationPageInfo) {
                    return;
                }

                switch (activeSelectionEvent.type) {

                    case 'created':

                        annotationBar = this.createAnnotationBar(annotationPageInfo.pageNum,
                                                                 annotationPageInfo.pageElement,
                                                                 annotationBarCallbacks,
                                                                 activeSelectionEvent);

                        break;

                    case 'destroyed':

                        if (annotationBar) {
                            this.destroyAnnotationBar(annotationBar);
                        }

                        break;

                }

                if (activeSelectionEvent.type === 'destroyed') {
                    // only created supported for now.
                    return;
                }

            }, target);
        };

        const computeTargets = (): ReadonlyArray<HTMLElement> => {

            const computeTargetsForLegacyViewer = (): ReadonlyArray<HTMLElement> => {
                const target = document.getElementById("viewerContainer")!;
                return [target];
            };

            const computeTargetsForWebViewer = (): ReadonlyArray<HTMLElement> => {

                const computeDocumentElements = (main: HTMLElement): ReadonlyArray<HTMLElement> => {

                    const iframes = Array.from(main.querySelectorAll("iframe"))
                        .map(iframe => iframe.contentDocument)
                        .filter(contentDocument => contentDocument !== null)
                        .map(contentDocument => contentDocument!)
                        .map(contentDocument => contentDocument.documentElement)
                        .map(documentElement => computeDocumentElements(documentElement))
                        .reduce(Reducers.FLAT, []);

                    return [main, ...iframes];

                };

                return computeDocumentElements(document.documentElement);

            };

            return computeTargetsForWebViewer();

        };

        const targets = computeTargets();
        for (const target of targets) {
            handleTarget(target);
        }

    }

    private static destroyAnnotationBar(annotationBar: HTMLElement) {

        if (annotationBar && annotationBar.parentElement) {
            annotationBar.parentElement!.removeChild(annotationBar);
        }

    }

    private static computePosition(pageElement: HTMLElement,
                                   point: Point,
                                   offset: Point | undefined): Point {

        const docFormat = DocFormatFactory.getInstance();

        let origin: Point =
            Optional.of(pageElement.getBoundingClientRect())
                .map(rect => {
                    return {'x': rect.left, 'y': rect.top};
                })
                .get();

        // one off for the html viewer... I hope we can unify these one day.
        if (docFormat.name === 'html') {
            origin = {x: 0, y: 0};
        }

        const relativePoint: Point =
            Points.relativeTo(origin, point);

        offset = offset || {x: 0, y: 0};

        const left = relativePoint.x + offset.x;
        const top = relativePoint.y + offset.y;

        return {
            x: left,
            y: top
        };

    }

    private static createAnnotationBar(pageNum: number,
                                       pageElement: HTMLElement,
                                       annotationBarCallbacks: AnnotationBarCallbacks,
                                       activeSelectionEvent: ActiveSelectionEvent) {

        const point: Point = {
            x: activeSelectionEvent.boundingClientRect.left + (activeSelectionEvent.boundingClientRect.width / 2),
            y: activeSelectionEvent.boundingClientRect.top
        };

        const offset: Point = {
            x: -75,
            y: -50
        };

        // TODO use the mouseDirection on the activeSelectionEvent and place
        // with top/bottom

        // TODO: we have to compute the position above or below based on the
        // direction of the mouse movement.

        const position = this.computePosition(pageElement, point, offset);

        const annotationBar = document.createElement('div');
        annotationBar.setAttribute("class", 'polar-annotation-bar');

        annotationBar.addEventListener('mouseup', (event) => event.stopPropagation());
        annotationBar.addEventListener('mousedown', (event) => event.stopPropagation());

        const style = `position: absolute; top: ${position.y}px; left: ${position.x}px; z-index: 10000;`;
        annotationBar.setAttribute('style', style);

        pageElement.insertBefore(annotationBar, pageElement.firstChild);

        const onHighlightedCallback = (highlightCreatedEvent: HighlightCreatedEvent) => {
            // TODO: there's a delay here and it might be nice to have a progress
            // bar until it completes.
            annotationBarCallbacks.onHighlighted(highlightCreatedEvent);
            this.destroyAnnotationBar(annotationBar);

        };

        ReactDOM.render(
            <ControlledAnnotationBar activeSelection={activeSelectionEvent}
                                     onHighlighted={onHighlightedCallback}
                                     type='range'
                                     pageNum={pageNum}/>,

            annotationBar

        );

        return annotationBar;

    }

}




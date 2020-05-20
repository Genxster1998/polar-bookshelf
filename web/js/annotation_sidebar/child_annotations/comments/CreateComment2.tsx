import * as React from 'react';
import {CancelButton} from "../CancelButton";
import {
    ICommentCreate,
    useAnnotationMutationsContext
} from "../../AnnotationMutationsContext";
import {useAnnotationActiveInputContext} from "../../AnnotationActiveInputContext";
import {EditComment2} from './EditComment2';
import {IDocAnnotation} from "../../DocAnnotation";
import { Refs } from 'polar-shared/src/metadata/Refs';

interface IProps {
    readonly parent: IDocAnnotation;
}

export const CreateComment2 = React.memo((props: IProps) => {

    const {parent} = props;

    const annotationInputContext = useAnnotationActiveInputContext();
    const annotationMutations = useAnnotationMutationsContext();

    const commentCallback = annotationMutations.createCommentCallback({selected: [parent]})

    const handleComment = React.useCallback((body: string) => {

        annotationInputContext.reset();

        const mutation: ICommentCreate = {
            selected: [props.parent],
            type: 'create',
            body,
            parent: Refs.createRef(props.parent),
        };

        commentCallback(mutation);

    }, []);


    const cancelButton = <CancelButton onClick={() => annotationInputContext.setActive('none')}/>;
    // FIXME try to use MUI Fade here I think.

    if (annotationInputContext.active !== 'comment') {
        return null;
    }

    return (
        <EditComment2 cancelButton={cancelButton} onComment={handleComment}/>
    );

});
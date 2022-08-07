import React, { useEffect, useState } from 'react';

export default function pointerLock(Component) {
    return React.forwardRef((props, ref) => {
        const [state, setState] = useState({
            locked: document.pointerLockElement !== null,
        });

        const isLocked = document.pointerLockElement !== null;
        useEffect(() => {
            setState({
                locked: isLocked,
            });
        }, [isLocked]);

        return (
            <Component
                {...props}
                ref={ref}
                pointerLocked={state.locked}
            />
        );
    });
}

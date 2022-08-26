import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import type { Viewport } from 'pixi-viewport';
import { Stage } from '@inlet/react-pixi';
import ViewportComponent from './graphics/ViewportComponent';
import { GetCellsDB } from '../gridDB/Cells/GetCellsDB';
import { useLiveQuery } from 'dexie-react-hooks';
import { useLoading } from '../../contexts/LoadingContext';
import useLocalStorage from '../../hooks/useLocalStorage';
import CellPixiReact from './graphics/CellPixiReact';
import AxesPixiReact from './graphics/AxesPixiReact';
import CursorPixiReact from './graphics/CursorPixiReact';
import MultiCursorPixiReact from './graphics/MultiCursorPixiReact';
import { gridInteractionStateAtom } from '../../atoms/gridInteractionStateAtom';
import { editorInteractionStateAtom } from '../../atoms/editorInteractionStateAtom';
import { useRecoilState } from 'recoil';
import { onKeyDownCanvas } from './interaction/onKeyDownCanvas';
import { onMouseDownCanvas } from './interaction/onMouseDownCanvas';
import { CellInput } from './interaction/CellInput';
import { onDoubleClickCanvas } from './interaction/onDoubleClickCanvas';
import { colors } from '../../theme/colors';
import { useMenuState } from '@szhsin/react-menu';
import RightClickMenu from '../../ui/menus/RightClickMenu';

import { ViewportEventRegister } from './interaction/ViewportEventRegister';

export default function QuadraticGrid() {
  const { loading } = useLoading();
  const viewportRef = useRef<Viewport>();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [canvasSize, setCanvasSize] = useState<{ width: number, height: number } | undefined>(undefined);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement>();
  const containerRef = useCallback(node => {
    setCanvasSize({ width: node.offsetWidth, height: node.offsetHeight });
    setCanvasRef(node);
  }, []);

  useEffect(() => {
    setCanvasSize({ width: canvasRef?.offsetWidth ?? 0, height: canvasRef?.offsetHeight ?? 0 });
  }, [windowWidth, windowHeight, canvasRef]);

  // Live query to update cells
  const cells = useLiveQuery(() => GetCellsDB());

  // Local Storage Config
  const [showGridAxes] = useLocalStorage('showGridAxes', true);

  // Interaction State hook
  const [interactionState, setInteractionState] = useRecoilState(
    gridInteractionStateAtom
  );

  // Editor Interaction State hook
  const [editorInteractionState, setEditorInteractionState] = useRecoilState(
    editorInteractionStateAtom
  );

  // Right click menu
  const { state: rightClickMenuState, toggleMenu: toggleRightClickMenu } =
    useMenuState();
  const [rightClickPoint, setRightClickPoint] = useState({ x: 0, y: 0 });

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setRightClickPoint({ x: event.clientX, y: event.clientY });
        toggleRightClickMenu(true);
      }}
    >
      <Stage
        id="QuadraticCanvasID"
        width={canvasSize?.width ?? 0}
        height={canvasSize?.height ?? 0}
        options={{
          resolution:
            // Always use 2 instead of 1. Better resolution.
            window.devicePixelRatio === 1.0 ? 2 : window.devicePixelRatio,
          backgroundColor: 0xffffff,
          antialias: true,
          autoDensity: true,
        }}
        tabIndex={0}
        onKeyDown={(event) => {
          onKeyDownCanvas(
            event,
            interactionState,
            setInteractionState,
            editorInteractionState,
            setEditorInteractionState,
            viewportRef
          );
        }}
        // onMouseDown={(event) => {
        //   onMouseDownCanvas(
        //     event,
        //     interactionState,
        //     setInteractionState,
        //     viewportRef
        //   );
        // }}
        onDoubleClick={(event) => {
          onDoubleClickCanvas(
            event,
            interactionState,
            setInteractionState,
            editorInteractionState,
            setEditorInteractionState
          );
        }}
        style={{
          display: loading ? 'none' : 'inline',
          position: "relative",
        }}
        // Disable rendering on each frame
        raf={false}
        // Render on each state change
        renderOnComponentChange={true}
      >
        <ViewportComponent
          screenWidth={windowWidth}
          screenHeight={windowHeight}
          viewportRef={viewportRef}
          onPointerDown={(world, event) => {
            onMouseDownCanvas(
              world,
              event,
              interactionState,
              setInteractionState,
              viewportRef
            );
          }}
        >
          {!loading &&
            cells?.map((cell) => (
              <CellPixiReact
                key={`${cell.x},${cell.y}`}
                x={cell.x}
                y={cell.y}
                text={cell.value}
                type={cell.type}
                renderText={
                  // Hide the cell text if the input is currently editing this cell
                  !(
                    interactionState.showInput &&
                    interactionState.cursorPosition.x === cell.x &&
                    interactionState.cursorPosition.y === cell.y
                  )
                }
                array_cells={cell.array_cells}
              ></CellPixiReact>
            ))}
          <AxesPixiReact visible={showGridAxes}></AxesPixiReact>
          <CursorPixiReact
            location={interactionState.cursorPosition}
          ></CursorPixiReact>
          <MultiCursorPixiReact
            originLocation={interactionState.multiCursorPosition.originPosition}
            terminalLocation={
              interactionState.multiCursorPosition.terminalPosition
            }
            visible={interactionState.showMultiCursor}
          ></MultiCursorPixiReact>
          {editorInteractionState.showCodeEditor && (
            <CursorPixiReact
              location={editorInteractionState.selectedCell}
              color={
                editorInteractionState.mode === 'PYTHON'
                  ? colors.cellColorUserPython
                  : colors.independence
              }
            ></CursorPixiReact>
          )}
        </ViewportComponent>
      </Stage>
      <CellInput
        interactionState={interactionState}
        setInteractionState={setInteractionState}
        viewportRef={viewportRef}
      ></CellInput>
      {viewportRef.current && (
        <ViewportEventRegister
          viewport={viewportRef.current}
        ></ViewportEventRegister>
      )}
      <RightClickMenu
        state={rightClickMenuState}
        anchorPoint={rightClickPoint}
        onClose={() => toggleRightClickMenu(false)}
        interactionState={interactionState}
      />
    </div>
  );
}

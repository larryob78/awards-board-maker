/* Human-controlled offsets of editable board text. No automatic creative positioning. */
(function(root){
  'use strict';
  const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
  function normalise(value={}){
    return {x:Math.max(-1400,Math.min(1400,finite(value.x,0))),y:Math.max(-990,Math.min(990,finite(value.y,0))),
      ...(value.width===undefined?{}:{width:Math.max(80,Math.min(1280,finite(value.width,400)))})};
  }
  function nudge(value,dx,dy){const box=normalise(value);return normalise({...box,x:box.x+finite(dx,0),y:box.y+finite(dy,0)});}
  root.BoardObjects=Object.freeze({normalise,nudge});
})(typeof window==='undefined'?globalThis:window);

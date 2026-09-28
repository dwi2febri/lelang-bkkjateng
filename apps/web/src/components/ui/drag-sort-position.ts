type RowRect={top:number;height:number};

// Compare reachable resting positions, not centers that cannot be crossed at
// the clamped first/last boundary. Also works with different card heights.
export function dragSortTarget(rects:RowRect[],from:number,offset:number):number {
 const source=rects[from];
 let target=from,nearest=Math.abs(offset);
 rects.forEach((row,index)=>{
  const position=index>from?row.top+row.height-source.height-source.top:row.top-source.top;
  const distance=Math.abs(offset-position);
  if(distance<nearest){nearest=distance;target=index;}
 });
 return target;
}

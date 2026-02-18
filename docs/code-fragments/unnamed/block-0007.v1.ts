for each of 8 offsets {
       const curve = new CatmullRomCurve3([
           basePoint,
           noiseOffset(basePoint + dir * 0.22),
           noiseOffset(basePoint + dir * 0.48),
           elbowPoint
       ]);
       new TubeGeometry(curve, 28, 0.0175 + tension*0.003);
   }
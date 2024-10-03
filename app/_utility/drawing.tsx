export function drawAngleWithOnCanvas(ctx, pointA, pointB, pointC, angle) {
    // 绘制三点 A、B、C
    // x, y, radius, startAngle, endAngle
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(pointA.x, pointA.y, 5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pointB.x, pointB.y, 5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pointC.x, pointC.y, 5, 0, 2 * Math.PI);
    ctx.fill();

    // 绘制两条线段 BA 和 BC
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pointA.x, pointA.y);
    ctx.lineTo(pointB.x, pointB.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pointB.x, pointB.y);
    ctx.lineTo(pointC.x, pointC.y);
    ctx.stroke();

    // 计算两个向量的角度差，用于绘制弧线
    const angleBA = Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
    const angleBC = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x);

    // 设置弧线的半径
    const radius = 40;

    // 绘制弧线
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.arc(
        pointB.x, pointB.y,   // 以 B 点为中心
        radius,               // 弧线的半径
        angleBA,              // 起始角度 (从 BA 方向开始)
        angleBC,              // 结束角度 (到 BC 方向)
        angleBC < angleBA     // 判断是否是逆时针
    );
    ctx.stroke();

    // 在弧线附近标出角度值
    const midAngle = (angleBA + angleBC) / 2; // 找到弧线的中点角度
    const textX = pointB.x + radius * Math.cos(midAngle); // 文本位置的X坐标
    const textY = pointB.y + radius * Math.sin(midAngle); // 文本位置的Y坐标
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.fillText(`${Math.round(angle)}°`, textX, textY); // 绘制角度值
};

export function drawAngleOnCanvas(ctx, pointA, pointB, pointC, angle) {
    // 绘制三点 A、B、C
    // x, y, radius, startAngle, endAngle

    // 计算两个向量的角度差，用于绘制弧线
    const angleBA = Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
    const angleBC = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x);

    // 设置弧线的半径
    const radius = 40;

    // 绘制弧线
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.arc(
        pointB.x, pointB.y,   // 以 B 点为中心
        radius,               // 弧线的半径
        angleBA,              // 起始角度 (从 BA 方向开始)
        angleBC,              // 结束角度 (到 BC 方向)
        angleBC < angleBA     // 判断是否是逆时针
    );
    ctx.stroke();

    // 在弧线附近标出角度值
    const midAngle = (angleBA + angleBC) / 2; // 找到弧线的中点角度
    const textX = pointB.x + radius * Math.cos(midAngle); // 文本位置的X坐标
    const textY = pointB.y + radius * Math.sin(midAngle); // 文本位置的Y坐标
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.fillText(`${Math.round(angle)}°`, textX, textY); // 绘制角度值
};

export function drawKeypoints(ctx, poses, threshold = 0.2) {
    poses.forEach((pose) => {
        pose.keypoints.forEach((keypoint) => {
            const { x, y, score, name } = keypoint;
            if (score > threshold) {
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'red';
                ctx.fill();
            }
        });
    });
};

export function drawSkeleton(ctx, poses, adjacentKeyPoints, threshold = 0.2) {
    poses.forEach((pose) => {
        adjacentKeyPoints.forEach(([i, j]) => {
            const keypoint1 = pose.keypoints[i];
            const keypoint2 = pose.keypoints[j];
            if (keypoint1.score > threshold && keypoint2.score > threshold) {
                ctx.beginPath();
                ctx.moveTo(keypoint1.x, keypoint1.y);
                ctx.lineTo(keypoint2.x, keypoint2.y);
                ctx.strokeStyle = 'green';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    })
};

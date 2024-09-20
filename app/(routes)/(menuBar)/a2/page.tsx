'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react'
//import DummyPage from '../../../_components/DummyPage'
import BottomMenuComponent from '@components/BottomMenuComponent'
import * as poseDetection from '@tensorflow-models/pose-detection';
//import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

export default function ContactPage() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    //const [standarPoses, setStandarPoses] = useState(null);
    const [adjustStandarKeypoints, setAdjustStandarKeypoints] = useState(null);
    const [isCameraOn, setCamerabtnStatus] = useState(false);
    const [detector, setDetector] = useState(null);

    async function loadModel() {
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING};
        const de = await poseDetection.createDetector(model, detectorConfig);
        setDetector(de);

//         const imgElement = imageRef.current;
//         const result = await de.estimatePoses(imgElement);
//         setStandarPoses(result);
    }

    useEffect(() => {
        if (isCameraOn) {
            loadModel();
            navigator.mediaDevices.getUserMedia({
                video: true
            }).then(stream => {
                const videoElement = videoRef.current;
                videoElement.srcObject = stream;
                videoElement.onloadeddata = () => {
                    videoElement.play();
                };
            }).catch((error) => {
                if (error.name === 'NotAllowedError') {
                  console.error('user rejected camera');
                } else {
                  console.error('error occured when call the camera', error);
                }
            });
        } else {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach((track) => track.stop());
                setStream(null);
                videoRef.current.srcObject = null;
            }
        }
        //return () => {};
    }, [isCameraOn]);

    const drawKeypoints = (ctx, poses, threshold = 0.2) => {
        poses.forEach((pose) => {
            //const aa = poseDetection.calculators.keypointsToNormalizedKeypoints(pose.keypoints, {width: 640, height: 480})
            //console.log(pose.keypoints);
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

    const drawSkeleton = (ctx, poses, threshold = 0.2) => {
        const adjacentKeyPoints = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
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

    useEffect(() => {
        if (detector) {
            async function scanStandar () {
                const imgElement = imageRef.current;
                console.log("before");
                const standarPoses = await detector.estimatePoses(imgElement);
                const shoulderDistance = getShoulderDistance(standarPoses[0].keypoints);
                const [hipDistance, leftHip, rightHip] = getHipDistance(standarPoses[0].keypoints);
                const scale = hipDistance; // or shoulderDistance
                const centerX = (leftHip.x + rightHip.x) / 2;
                const centerY = (leftHip.y + rightHip.y) / 2;
                console.log(centerY, centerX);
                const result = standarPoses[0].keypoints.map(({y, x, score, name}) => {
                    return {
                        y: (y - centerY), // scale by hipDistance
                        x: (x - centerX), // offset by center
                        score: score,
                        name: name
                    };
                });
                const aa = poseDetection.calculators.keypointsToNormalizedKeypoints(result, {width: 640, height: 480})
                setAdjustStandarKeypoints(aa);
            }
            scanStandar();
        }
    }, [detector]);

    useEffect(() => {
        if (detector) {
            const interval = setInterval(async () => {
                const videoElement = videoRef.current;
                if (videoElement && videoElement.readyState === 4) {
                    const poses = await detector.estimatePoses(videoElement);
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    compareWithStandar(poses);
                    drawKeypoints(ctx, poses);
                    drawSkeleton(ctx, poses);
                }
            }, 1000);
            return () => {
                clearInterval(interval);
                console.log("clear");
            }
        }
    }, [detector, adjustStandarKeypoints]);

    function getShoulderDistance(keypoints) {
        const leftShoulder = keypoints[5].name === 'left_shoulder' ? keypoints[5] : keypoints.find(point => point.name === 'left_shoulder');
        const rightShoulder = keypoints[6].name === 'right_shoulder' ? keypoints[6] : keypoints.find(point => point.name === 'right_shoulder');
        const shoulderDistance = keypointsDistance(leftShoulder, rightShoulder);
        return shoulderDistance;
    }

    function getHipDistance(keypoints) {
        const leftHip = keypoints[11].name === 'left_hip' ? keypoints[11] : keypoints.find(point => point.name === 'left_hip');
        const rightHip = keypoints[12].name === 'right_hip' ? keypoints[12] : keypoints.find(point => point.name === 'right_hip');
        const hipDistance = keypointsDistance(leftHip, rightHip);
        return [hipDistance, leftHip, rightHip];
    }

    function keypointsDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    }

    function compareWithStandar(poses) {
        const shoulderDistance = getShoulderDistance(poses[0].keypoints);
        const [hipDistance, leftHip, rightHip] = getHipDistance(poses[0].keypoints);
        const scale = hipDistance; // or shoulderDistance
        const centerX = (leftHip.x + rightHip.x) / 2;
        const centerY = (leftHip.y + rightHip.y) / 2;
        //console.log(centerY, centerX);
        const adjustedKeypoints = poses[0].keypoints.map(({y, x, score, name}) => {
            return {
                y: (y - centerY), // scale by hipDistance
                x: (x - centerX), // offset by center
                score: score,
                name: name
            };
        });
        const aa = poseDetection.calculators.keypointsToNormalizedKeypoints(adjustedKeypoints, {width: 640, height: 480})
        //console.log(aa[9]);

        if (adjustStandarKeypoints) {
            //console.log("standar: ", adjustStandarKeypoints[9]);
            const distances = aa.map((p1, index) => keypointsDistance(p1, adjustStandarKeypoints[index]));
            const averageDistance = distances.reduce((a, b) => a+b, 0) / distances.length;
            console.log(averageDistance);
        }
    }

    function compareUpperBody(userPoses) {
    }

    function compareLowerBody(userPoses) {
    }

    return (
        <BottomMenuComponent title="Planner Page">
            <img className="" ref={imageRef} src="/standar.jpg" width="640" height="480"></img>
            <div className="flex float-left">
                <canvas ref={canvasRef} width="640" height="480"></canvas>
            </div>
            {isCameraOn ? (
                <div className="flex">
                    <video ref={videoRef} autoPlay playsInline className="left" width="640" height="480"></video>
                </div>
            ) : (
                <div></div>
            )}
            <button className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-full"
                onClick={() => setCamerabtnStatus(!isCameraOn)}>
                {isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            </button>

        </BottomMenuComponent>
    )
}

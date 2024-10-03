'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react';
//import DummyPage from '../../../_components/DummyPage'
import BottomMenuComponent from '@components/BottomMenuComponent';
import ProgressBar from '@components/ProgressBar';
import styles from '@styles/a2.module.css';
import {drawAngleOnCanvas, drawKeypoints, drawSkeleton} from '@utility/drawing';
import * as poseDetection from '@tensorflow-models/pose-detection';
//import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

export default function ContactPage() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const [standarHip, setStandarHip] = useState(null);
    const [adjustStandarKeypoints, setAdjustStandarKeypoints] = useState(null);
    const [isCameraOn, setCamerabtnStatus] = useState(false);
    const [detector, setDetector] = useState(null);
    const [progress, setProgress] = useState(0);

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

    useEffect(() => {
        if (detector) {
            async function scanStandar () {
                const imgElement = imageRef.current;
                console.log("before");
                const standarPoses = await detector.estimatePoses(imgElement);
                const shoulderDistance = getShoulderDistance(standarPoses[0].keypoints);
                const [hipDistance, leftHip, rightHip] = getHipDistance(standarPoses[0].keypoints);
                const scale = hipDistance; // or shoulderDistance
                setStandarHip(hipDistance);
                const centerX = (leftHip.x + rightHip.x) / 2;
                const centerY = (leftHip.y + rightHip.y) / 2;
                //console.log(shoulderDistance, hipDistance);
                //console.log(centerY, centerX);
                const result = standarPoses[0].keypoints.map(({y, x, score, name}) => {
                    return {
                        y: (y - centerY), // scale by hipDistance, divide by scale not used
                        x: (x - centerX), // offset by center
                        score: score,
                        name: name
                    };
                });
                //console.log(result);
                const aa = poseDetection.calculators.keypointsToNormalizedKeypoints(result, {width: 640, height: 480})
                //console.log(aa);
                setAdjustStandarKeypoints(aa);

                const rightShoulder = getKeyPointInfo(standarPoses[0].keypoints, 6, 'right_shoulder');
                const rightElbow = getKeyPointInfo(standarPoses[0].keypoints, 8, 'right_elbow');
                const rightWrist = getKeyPointInfo(standarPoses[0].keypoints, 10, 'right_wrist');
                const shoulderAngle = getKeypointAngle(rightShoulder, rightElbow, rightWrist);
                console.log(shoulderAngle);
            }
            scanStandar();
        }
    }, [detector]);

    useEffect(() => {
        if (detector) {
            const interval = setInterval(async () => {
                const videoElement = videoRef.current;
                if (videoElement && videoElement.readyState === 4) {
                    try {
                        const poses = await detector.estimatePoses(videoElement);
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        compareWithStandar(poses);
                        drawKeypoints(ctx, poses);
                        const adjacentKeyPoints = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
                        drawSkeleton(ctx, poses, adjacentKeyPoints);

                        const rightShoulder = getKeyPointInfo(poses[0].keypoints, 6, 'right_shoulder');
                        const rightElbow = getKeyPointInfo(poses[0].keypoints, 8, 'right_elbow');
                        const rightWrist = getKeyPointInfo(poses[0].keypoints, 10, 'right_wrist');
                        const shoulderAngle = getKeypointAngle(rightShoulder, rightElbow, rightWrist);
                        //console.log(shoulderAngle);
                        drawAngleOnCanvas(ctx, rightShoulder, rightElbow, rightWrist, shoulderAngle);
                    }  catch (error) {
                        console.log(error);
                    }
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
        if (poses.length === 0) {
            return;
        }
        const shoulderDistance = getShoulderDistance(poses[0].keypoints);
        const [hipDistance, leftHip, rightHip] = getHipDistance(poses[0].keypoints);
        //const scale = hipDistance; // or shoulderDistance
        const scale = standarHip ? hipDistance / standarHip : 1;
        //console.log("scale:", scale, hipDistance, standarHip);
        const centerX = (leftHip.x + rightHip.x) / 2;
        const centerY = (leftHip.y + rightHip.y) / 2;
        //console.log(centerY, centerX);
        const adjustedKeypoints = poses[0].keypoints.map(({y, x, score, name}) => {
            return {
                y: (y - centerY) / scale, // scale by hipDistance, divide by scale not used
                x: (x - centerX) / scale, // offset by center
                score: score,
                name: name
            };
        });
        //console.log(adjustedKeypoints);
        const aa = poseDetection.calculators.keypointsToNormalizedKeypoints(adjustedKeypoints, {width: 640, height: 480})
        //console.log(aa);

        if (adjustStandarKeypoints) {
            //console.log("standar: ", adjustStandarKeypoints[9]);
            const distances = aa.map((p1, index) => keypointsDistance(p1, adjustStandarKeypoints[index]));
            //console.log(distances);
            const averageDistance = distances.reduce(
                (accumulator, currentValue) => accumulator + currentValue, 0) / distances.length;
            //console.log(averageDistance);
            const rightShoulder = getKeyPointInfo(poses[0].keypoints, 6, 'right_shoulder');
            const rightElbow = getKeyPointInfo(poses[0].keypoints, 8, 'right_elbow');
            const rightWrist = getKeyPointInfo(poses[0].keypoints, 10, 'right_wrist');
            const shoulderAngle = getKeypointAngle(rightShoulder, rightElbow, rightWrist);
            //console.log(shoulderAngle);

            setProgress((1 - averageDistance) * 100);
        }
    }

    function getKeyPointInfo(keypoints, index, name) {
        const kp = keypoints[index].name === name ? keypoints[index] : keypoints.find(point => point.name === name);
        return kp
    }

    function getKeypointAngle(p1, p2, p3) {
        // 2PI = 360, 1弧度 = 180/PI
        //console.log(Math.atan2(p3.y - p2.y, p3.x - p2.x));
        //console.log(Math.atan2(p1.y - p2.y, p1.x - p2.x));
        //console.log(p3.y - p2.y, p3.x - p2.x);
        //console.log(p1.y - p2.y, p1.x - p2.x);

        const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
        return Math.abs(angle * 180.0 / Math.PI);
    }

    function compareUpperBody(userPoses) {
    }

    function compareLowerBody(userPoses) {
    }

    return (
        <BottomMenuComponent title="Planner Page">
            <div className={`${styles.h_480}`}>
                <img className="flex float-left mr-3 ml-3" ref={imageRef} src="/standar.jpg" width="640" height="480"></img>
                <div className="flex flex-col" style={{width: 640}}>
                    <h1 className="text-3xl font-bold mb-60 h-24">Completion</h1>
                    <ProgressBar progress={progress} />
                    <p className="mt-4">{progress}%</p>
                </div>
            </div>
            <div className={`${styles.h_480}`}>
                <canvas className={`${styles.canvas_bg} float-left mx-3`} ref={canvasRef} width="640" height="480"></canvas>
                {isCameraOn ? (
                <video ref={videoRef} autoPlay playsInline className="float-left" width="640" height="480"></video>
                ) : (
                <div className="float-left center" style={{width: 640}}>video</div>
                )}
                <button className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-full"
                    onClick={() => setCamerabtnStatus(!isCameraOn)}>
                    {isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                </button>
            </div>
        </BottomMenuComponent>
    )
}

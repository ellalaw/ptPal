'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react'
//import DummyPage from '../../../_components/DummyPage'
import BottomMenuComponent from '@components/BottomMenuComponent'
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

export default function ContactPage() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isCameraOn, setCamerabtnStatus] = useState(false);
    const [detector, setDetector] = useState(null);

    async function loadModel() {
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING};
        const de = await poseDetection.createDetector(model, detectorConfig);
        setDetector(de);
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
//                 if (name === 'left_wrist') {
//                     console.log(x, y, score)
//                     const leftHip = keypoint;
//                 }
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
            const interval = setInterval(async () => {
                const videoElement = videoRef.current;
                if (videoElement && videoElement.readyState === 4) {
                    const poses = await detector.estimatePoses(videoElement);
                    //console.log(poses);
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    //resetCenter(poses);
                    drawKeypoints(ctx, poses);
                    drawSkeleton(ctx, poses);
                }
            }, 100);
            return () => clearInterval(interval);
        }
    });

    return (
        <BottomMenuComponent title="Planner Page">
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

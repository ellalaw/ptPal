'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react';
//import DummyPage from '../../../_components/DummyPage'
import BottomMenuComponent from '@components/BottomMenuComponent';
import ProgressBar from '@components/ProgressBar';
import styles from '@styles/a2.module.css';
import {drawAngleOnCanvas, drawKeypoints, drawSkeleton} from '@utility/drawing';
import { Canvas } from '@react-three/fiber';
import { mesh } from 'three';
import { useFrame } from '@react-three/fiber';
//import { OrbitControls } from '@react-three/drei';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import * as tfc from '@tensorflow/tfjs-converter';
import '@tensorflow/tfjs-backend-webgl';

export default function ContactPage() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const [standarHip, setStandarHip] = useState(null);
    const [adjustStandarKeypoints, setAdjustStandarKeypoints] = useState(null);
    const [isCameraOn, setCamerabtnStatus] = useState(false);
    const [detector, setDetector] = useState(null);
    const [graphModel, setGraphModel] = useState(null);
    const [progress, setProgress] = useState(0);
    const [keypoints3D, setKeypoints3D] = useState([]);
    const [twoDFrames, setTwoDFrames] = useState([]);

    async function loadModel() {
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING};
        const de = await poseDetection.createDetector(model, detectorConfig);
        setDetector(de);

        const model2 = await tfc.loadGraphModel('/models/model.json');
        setGraphModel(model2);
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
                        if (poses.length === 0) return;
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

                        composeKeypoints2(poses);
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
    }, [detector, adjustStandarKeypoints, graphModel]);

//     useEffect(() => {
//         console.log(twoDFrames.length);
//         if (twoDFrames.length === 243) {
//             runInference(twoDFrames);
//             //setTwoDFrames([]);
//             clearList();
//         }
//     }, [twoDFrames.length === 243]);

    function clearList() {
        setTwoDFrames([]);
    }

    function composeKeypoints(poses) {
//         const keypoints2D = poses.map(pose =>
//           pose.keypoints.map(k => [k.x, k.y])
//         );
        const frames = [];
        //console.log(poses[0].keypoints);
        for (let i = 0; i < 243; i++) {
            const keypoints2D = poses[0].keypoints.map(k => [k.x, k.y]);
            frames.push(keypoints2D);
        }
        const frames2 = [];
        poses[0].keypoints.map(({y, x, score, name}) => {
            frames2.push([x, y]);
        })
        //console.log(frames);
        runInference(frames2);
    }

    async function runInference(frames) {
        //const inputTensor = tf.tensor(frames, [1, 17, 2, 243]);
        //const paddedData = tf.pad(tf.tensor(poses), [[0, 8261]]);
        const inputTensor = tf.tensor(frames)//.transpose([1, 2, 0]);
        console.log(inputTensor.arraySync());
        //const reshapeTensor = inputTensor.reshape([1, 17, 2, 243]);
        const reshapeTensor = inputTensor.reshape([1, 17, 2, 243]);

        if (reshapeTensor !== null) {
            console.log(reshapeTensor.arraySync());
            const outputTensor = graphModel.execute({ 'onnx____reshape_0': reshapeTensor });
            //const outputTensor = graphModel.execute(reshapeTensor);
            //outputTensor.print();
            const outputArray = outputTensor.arraySync();

            console.log(outputArray[0][0]);
            setKeypoints3D(outputArray[0][0]);
        }
    }

    async function aa(keypoints2D) {
        const inputTensor = tf.tensor(keypoints2D).transpose([1, 2, 0]);
        const reshapeTensor = inputTensor.reshape([1, 17, 2, 243]);

        if (reshapeTensor !== null) {
            const outputTensor = graphModel.predict(reshapeTensor);
            const outputArray = outputTensor.arraySync();
            console.log(outputArray[0][0][0]);
        }
    }
    async function bb(keypoints2D) {
        const inputTensor = tf.tensor(keypoints2D).transpose([1, 2, 0]);
        const reshapeTensor = inputTensor.reshape([1, 17, 2, 243]);

        if (reshapeTensor !== null) {
            const outputTensor = graphModel.execute({ 'onnx____reshape_0': reshapeTensor });
            const outputArray = outputTensor.arraySync();
            console.log(outputArray[0][0][0]);
        }
    }

    function composeKeypoints2(poses) {
        console.log(poses[0].keypoints);
        //const cc = poseDetection.calculators.keypointsToNormalizedKeypoints(poses[0].keypoints, {width: 640, height: 480})
        const aa = poses[0].keypoints.map(({y, x, score, name}) => ({
            x: (x / 640) * 2 - 1,
            y: (1 - (y / 480)) * 2 - 1,
            z: 0
        }));
        console.log(aa);
//         const bb = cc.map(key => ({
//             x: (key.x + 1) * (640 / 2),
//             y: (1 - key.y) * (480 / 2),
//             z: 0
//         }));

        const bb = poses[0].keypoints.map(({y, x, score, name}) => ({
            x: x - 320,
            y: -(y - 240),
            z: 0
        }));

        const frames = [];
        aa.map(({x, y, z}) => {
            //frames.push([x, y, Math.random() * -2]);
            frames.push([x, y, 0]);
        });
//         bb.map(({x, y, z}) => {
//             frames.push([x, y, Math.random() * -2]);
//         });
        console.log(frames);
        setKeypoints3D(frames);
        //runInference2(frames);
    }

    async function runInference2(frames) {
        const inputTensor = tf.tensor(frames);
        const outputTensor = graphModel.execute({ 'onnx____reshape_0': inputTensor });
        const outputArray = outputTensor.arraySync();
        console.log(outputArray[0][0]);
    }

    function DrawPoint3D({ keypoints3D }) {
        console.log(keypoints3D);
        if (!keypoints3D || keypoints3D.length === 0) return null;
        //const [keypoints, setKeypoints] = useState([]);

//         useEffect(() => {
//             setKeypoints(keypoints3D);
//         }, [keypoints3D]);


//        useFrame(() => {
//             setKeypoints(prevKeypoints =>
//                 prevKeypoints.map((point, index) => {
//                     return [
//                         keypoints3D[index].x,
//                         keypoints3D[index].y,
//                         keypoints3D[index].z,
//                     ];
//                 })
//             );
//            setKeypoints(keypoints3D));
//        });
        return keypoints3D.map((keypoint, index) => (
            <mesh key={index} position={keypoint}>
              <sphereGeometry args={[0.03, 16, 16]} />
              <meshStandardMaterial color="red" />
            </mesh>
        ));
    }

    function DrawSkeleton3D({ keypoints3D }) {
        console.log(keypoints3D);
        console.log(!!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('webgl'));
        if (!keypoints3D || keypoints3D.length === 0) return null;
        const adjacentKeyPoints = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
        console.log(adjacentKeyPoints);
        return adjacentKeyPoints.map(([i, j], index) => {
            const keypoint1 = keypoints3D[i];
            const keypoint2 = keypoints3D[j];
            const points = [new THREE.Vector3(keypoint1[0], keypoint1[1], keypoint1[2]),
                            new THREE.Vector3(keypoint2[0], keypoint2[1], keypoint2[2])];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            return (
                <Line
                    key={index}
                    points={[keypoint1, keypoint2]}
                    color="red"
                    lineWidth={1}
                />

//                 <lineSegments key={index} geometry={geometry}>
//                     <lineBasicMaterial attach="material" color="orange" linewidth={1} />
//                 </lineSegments>
            )
        });

    }

//     async function convertTo3D(poses) {
//       const keypoints2D = poses[0].keypoints;
//       const inputTensor = tf.tensor(keypoints2D).expandDims(0);  // 形状为 (1, N, 17, 2)
//       const outputTensor = graphModel.predict(inputTensor);  // 输出为 3D 关键点
//       const keypoints3D = outputTensor.arraySync();  // 转换为 JS 数组
//       return keypoints3D[0];  // 3D 关键点
//     }

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

    function Box() {
      const meshRef = useRef();
      useFrame(() => {
        if (meshRef.current) {
          meshRef.current.rotation.x += 0.01;
          meshRef.current.rotation.y += 0.01;
        }
      });

      return (
        <mesh ref={meshRef} position={[0, 0, 0]}>
          {/* 立方体的几何结构 */}
          <boxGeometry args={[1, 1, 1]} />
          {/* 立方体的材质 */}
          <meshStandardMaterial color="orange" />
        </mesh>
      );
    }
    function Ground() {
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="lightgreen" />
        </mesh>
      );
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
                {/*<Canvas orthographic camera={{ zoom: 200, position: [0, 0, 5] }}>*/}
                <Canvas orthographic camera={{ zoom: 200, position: [0, 0, 5], fov: 75 }}>
                    <color attach="background" args={['#777777']} />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} intensity={1} />
                    <pointLight position={[10, 10, 10]} />
                    <DrawPoint3D keypoints3D={keypoints3D} />
                    <DrawSkeleton3D keypoints3D={keypoints3D} />
                </Canvas>
            </div>
            {/*<div className={`${styles.h_480}`}>
                <Canvas camera={{ position: [320, 240, 500] }}>
                    <color attach="background" args={['#1a1a2e']} />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} intensity={1} />
                    <pointLight position={[10, 10, 10]} />
                    <DrawPoint3D keypoints3D={keypoints3D} />
                    <DrawSkeleton3D keypoints3D={keypoints3D} />
                </Canvas>
            </div>*/}
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

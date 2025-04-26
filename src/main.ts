import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { Animation } from "@babylonjs/core/Animations/animation";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Container } from "@babylonjs/gui/2D/controls/container";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { HTMLTwinRenderer } from "@babylonjs/accessibility";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { QuadraticEase } from "@babylonjs/core/Animations/easing";
import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
// import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";

import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";
import "@babylonjs/core/Animations/animatable";
import "@babylonjs/core/Helpers/sceneHelpers";

class Game {
    private _scene!: Scene;
    private _useAnimations = true;

    constructor(private _engine: Engine) {}

    async start() {
        this._scene = new Scene(this._engine);

        if (import.meta.env.DEV) {
            import("@babylonjs/inspector")
                .then(() => {
                    window.addEventListener("keydown", (ev) => {
                        if (ev.ctrlKey && ev.key === "I") {
                            if (this._scene.debugLayer.isVisible()) {
                                this._scene.debugLayer.hide();
                            } else {
                                this._scene.debugLayer.show();
                            }
                        }
                    });
                })
                .catch((e) => {
                    console.log(`Failed to load inspector: ${e.message}`);
                });
        }

        const { idleAnim, waveAnim, shark, amy, uiMesh, uiRatio } =
            await this.buildSceneObjects(this._scene);

        amy.accessibilityTag = {
            description: "A young girl named Amy. She is happy you are doing her quiz!",
        };

        shark.accessibilityTag = {
            description: "A powerful shark. It is swimming.",
        };

        const primaryColor = "#1b1869";
        const secondaryColor = "skyblue";

        const baseUiWidth = 1024;
        const advancedTexture = AdvancedDynamicTexture.CreateForMesh(
            uiMesh,
            baseUiWidth,
            baseUiWidth * uiRatio
        );

        const { panel: titlePanel, transitionButtons: titleBtns } =
            this.buildTitleGUI(primaryColor, secondaryColor, advancedTexture);
        const { panel: questionPanel, transitionButtons: questionBtns } =
            this.buildQuestionGUI(primaryColor, secondaryColor, advancedTexture);
        const { panel: answerPanel, transitionButtons: answerBtns } =
            this.buildAnswerGUI(primaryColor, secondaryColor, advancedTexture);

        questionPanel.isVisible = false;
        answerPanel.isVisible = false;

        titleBtns[0].onPointerClickObservable.add(() => {
            this.swapContainers(this._scene, titlePanel, questionPanel);
            this.swapAnimations(waveAnim, idleAnim);
            this.swapAccessibilityDescriptions(
                amy,
                "A young girl named Amy. She is waiting for your answer."
            );
        });

        questionBtns.forEach((btn) => {
            btn.onPointerClickObservable.add(() => {
                this.swapContainers(this._scene, questionPanel, answerPanel);
                this.swapModels(this._scene, amy, shark);
            });
        });

        answerBtns[0].onPointerClickObservable.add(() => {
            this.swapContainers(this._scene, answerPanel, titlePanel);
            this.swapModels(this._scene, shark, amy);
            this.swapAnimations(idleAnim, waveAnim);
            this.swapAccessibilityDescriptions(
                amy,
                "A young girl named Amy. She is happy you are doing her quiz!"
            );
        });

        HTMLTwinRenderer.Render(this._scene);

        this._engine.runRenderLoop(() => {
            this._scene.render();
        });
        window.addEventListener("resize", () => {
            this._engine.resize();
        });
    }

    swapAccessibilityDescriptions(node: TransformNode, to: string) {
        if (node.accessibilityTag) {
            node.accessibilityTag.description = to;
        }
    }

    swapModels(scene: Scene, from: TransformNode, to: TransformNode) {
        if (this._useAnimations) {
            scene.beginDirectAnimation(
                from,
                [
                    this.buildFadeAnimation(
                        false,
                        "scaling",
                        new Vector3(0, 0, 0),
                        new Vector3(1, 1, 1),
                        60,
                        Animation.ANIMATIONTYPE_VECTOR3
                    ),
                ],
                0,
                60,
                false,
                1,
                () => {
                    from.setEnabled(false);
                    to.setEnabled(true);
                    scene.beginDirectAnimation(
                        to,
                        [
                            this.buildFadeAnimation(
                                true,
                                "scaling",
                                new Vector3(0, 0, 0),
                                new Vector3(1, 1, 1),
                                60,
                                Animation.ANIMATIONTYPE_VECTOR3
                            ),
                        ],
                        0,
                        60,
                        false,
                        1
                    );
                }
            );
        } else {
            from.setEnabled(false);
            to.setEnabled(true);
            to.scaling = new Vector3(1, 1, 1);
        }
    }

    swapAnimations(anim1: AnimationGroup, anim2: AnimationGroup) {
        anim1.stop();
        anim2.start(true);
    }

    swapContainers(scene: Scene, from: Container, to: Container) {
        if (this._useAnimations) {
            scene.beginDirectAnimation(
                from,
                [
                    this.buildFadeAnimation(
                        false,
                        "alpha",
                        0,
                        1,
                        60,
                        Animation.ANIMATIONTYPE_FLOAT
                    ),
                ],
                0,
                60,
                false,
                1,
                () => {
                    from.isVisible = false;
                    to.isVisible = true;
                    scene.beginDirectAnimation(
                        to,
                        [
                            this.buildFadeAnimation(
                                true,
                                "alpha",
                                0,
                                1,
                                60,
                                Animation.ANIMATIONTYPE_FLOAT
                            ),
                        ],
                        0,
                        60,
                        false,
                        1
                    );
                }
            );
        } else {
            from.isVisible = false;
            to.isVisible = true;
            to.alpha = 1;
        }
    }

    buildTitleGUI(
        primaryColor: string,
        secondaryColor: string,
        advancedTexture: AdvancedDynamicTexture
    ) {
        const titlePanel = this.addPanel(
            true,
            "100%",
            "100%",
            20,
            secondaryColor,
            advancedTexture
        );

        this.addText("Welcome to Amy's Quiz!", 96, primaryColor, titlePanel);
        this.addText(
            "Click on the button below to start the quiz!",
            56,
            primaryColor,
            titlePanel
        );

        const animationsButton = this.addButton(
            `Turn ${this._useAnimations ? "Off" : "On"} Animations`,
            "80%",
            "48px",
            primaryColor,
            secondaryColor,
            titlePanel
        );
        animationsButton.onPointerClickObservable.add(() => {
            this._useAnimations = !this._useAnimations;
            animationsButton.textBlock!.text = `Turn ${
                this._useAnimations ? "Off" : "On"
            } Animations`;
            animationsButton.accessibilityTag = {
                description: animationsButton.textBlock!.text,
            };
        });

        const startButton = this.addButton(
            "Start Quiz",
            "80%",
            "56px",
            primaryColor,
            secondaryColor,
            titlePanel
        );

        return { panel: titlePanel, transitionButtons: [startButton] };
    }

    buildQuestionGUI(
        primaryColor: string,
        secondaryColor: string,
        advancedTexture: AdvancedDynamicTexture
    ) {
        const questionPanel = this.addPanel(
            true,
            "100%",
            "100%",
            20,
            secondaryColor,
            advancedTexture
        );

        this.addText(
            "In what geologic time period appeared the first sharks?",
            56,
            primaryColor,
            questionPanel
        );

        const b1 = this.addButton(
            "Cretaceous",
            "80%",
            "40px",
            secondaryColor,
            primaryColor,
            questionPanel
        );
        const b2 = this.addButton(
            "Silurian",
            "80%",
            "40px",
            secondaryColor,
            primaryColor,
            questionPanel
        );
        const b3 = this.addButton(
            "Paleogene",
            "80%",
            "40px",
            secondaryColor,
            primaryColor,
            questionPanel
        );

        return { panel: questionPanel, transitionButtons: [b1, b2, b3] };
    }

    buildAnswerGUI(
        primaryColor: string,
        secondaryColor: string,
        advancedTexture: AdvancedDynamicTexture
    ) {
        const answerPanel = this.addPanel(
            true,
            "100%",
            "100%",
            20,
            secondaryColor,
            advancedTexture
        );

        this.addText("The correct answer is:", 64, primaryColor, answerPanel);
        this.addText("Silurian", 60, primaryColor, answerPanel);
        this.addText(
            "The oldest generally accepted 'shark' scales are from about 420 million years ago, in the Silurian period. Those animals looked very different from modern sharks. At this time the most common shark tooth is the cladodont, a style of thin tooth with three tines like a trident, apparently to help catch fish. (font: Wikipedia)",
            56,
            primaryColor,
            answerPanel
        );

        const r = this.addButton(
            "Reset",
            "40%",
            "40px",
            secondaryColor,
            primaryColor,
            answerPanel
        );

        return { panel: answerPanel, transitionButtons: [r] };
    }

    addPanel(
        vertical: boolean,
        width: string,
        height: string,
        spacing: number,
        background: string,
        parent: Container | AdvancedDynamicTexture
    ) {
        const panel = new StackPanel("panel");
        panel.isVertical = vertical;
        panel.width = width;
        panel.height = height;
        panel.spacing = spacing;
        panel.background = background;
        parent.addControl(panel);
        return panel;
    }

    addText(
        text: string,
        fontSize: number,
        textColor: string,
        parent: Container
    ) {
        const textBlock = new TextBlock(text);
        textBlock.text = text;
        textBlock.fontSize = fontSize;
        textBlock.textWrapping = true;
        textBlock.resizeToFit = true;
        textBlock.color = textColor;
        parent.addControl(textBlock);
    }

    addButton(
        text: string,
        width: string,
        height: string,
        color: string,
        background: string,
        parent: Container
    ) {
        const button = Button.CreateSimpleButton("startButton", text);
        button.width = width;
        button.height = height;
        button.textBlock!.fontSize = height;
        button.color = color;
        button.background = background;
        parent.addControl(button);
        return button;
    }

    buildFadeAnimation(
        fadeIn: boolean,
        property: string,
        from: any,
        to: any,
        duration: number,
        type: number
    ) {
        const anim = new Animation(
            "fadeAnim",
            property,
            30,
            type,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        anim.setKeys([
            { frame: 0, value: fadeIn ? from : to },
            { frame: duration, value: fadeIn ? to : from },
        ]);
        const easingFunction = new QuadraticEase();
        anim.setEasingFunction(easingFunction);
        return anim;
    }

    async buildSceneObjects(scene: Scene) {
        const camera = new ArcRotateCamera(
            "c",
            Math.PI / 2,
            1.41,
            5,
            new Vector3(-1, 1, 0)
        );
        const light = new HemisphericLight("l", new Vector3(0, 1, 0), scene);

        camera.attachControl();

        const skyColor = new Color3(56 / 255, 82 / 255, 252 / 255);
        const groundColor = new Color3(139 / 255, 191 / 255, 138 / 255);
        scene.createDefaultEnvironment({
            skyboxColor: skyColor,
            groundColor: groundColor,
        });

        const { meshes, animationGroups } = await SceneLoader.ImportMeshAsync(
            "",
            "./glb/",
            "amy-wave-idle.glb",
            scene,
            undefined,
            ".glb"
        );

        const amy = meshes[0];
        const amyTransformParent = new TransformNode("amyTransform");
        amy.parent = amyTransformParent;

        const idleAnim = animationGroups[0];
        const waveAnim = animationGroups[1];

        idleAnim.stop();
        waveAnim.start(true);

        const sharkResult = await SceneLoader.ImportMeshAsync(
            "",
            "./glb/",
            "shark.glb",
            scene
        );

        const rootShark = sharkResult.meshes[0];
        rootShark.normalizeToUnitCube();
        rootShark.scaling.scaleInPlace(4);

        const transformParent = new TransformNode("sharkTransform");
        rootShark.parent = transformParent;

        transformParent.position.y = 0.5;
        transformParent.setEnabled(false);

        const width = 2;
        const ratio = 1;
        const plaqueMesh = MeshBuilder.CreatePlane(
            "plaque",
            { width, height: width * ratio },
            scene
        );
        plaqueMesh.position.x = -2;
        plaqueMesh.position.y = width * ratio * 0.5 + 0.1;
        plaqueMesh.rotation.y = Math.PI;

        scene.createDefaultXRExperienceAsync();

        return {
            camera,
            light,
            amy: amyTransformParent,
            idleAnim,
            waveAnim,
            shark: transformParent,
            uiMesh: plaqueMesh,
            uiRatio: ratio,
        };
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    const canvas = document.getElementById("renderCanvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Render canvas element not found or is not a canvas.");
    }

    let engine: Engine;

    // Temporarily force WebGL due to WebGPU issues
    console.log("Initializing WebGL engine...");
    engine = new Engine(canvas, true, { adaptToDeviceRatio: true });
    console.log("WebGL engine initialized successfully.");

    /*
    // Uncomment this block to re-enable WebGPU support after verifying browser compatibility
    try {
        const webGPUSupported = await WebGPUEngine.IsSupportedAsync;
        if (webGPUSupported) {
            console.log("WebGPU is supported, attempting to initialize...");
            const webgpu = new WebGPUEngine(canvas, {
                adaptToDeviceRatio: true,
                antialias: true,
            });
            await webgpu.initAsync();
            engine = webgpu;
            console.log("WebGPU engine initialized successfully.");
        } else {
            console.warn("WebGPU is not supported, falling back to WebGL.");
            engine = new Engine(canvas, true, { adaptToDeviceRatio: true });
            console.log("WebGL engine initialized successfully.");
        }
    } catch (error) {
        console.error("WebGPU initialization failed:", error);
        console.warn("Falling back to WebGL engine.");
        engine = new Engine(canvas, true, { adaptToDeviceRatio: true });
        console.log("WebGL engine initialized successfully.");
    }
    */

    const game = new Game(engine);
    try {
        await game.start();
    } catch (error) {
        console.error("Failed to start game:", error);
    }
});
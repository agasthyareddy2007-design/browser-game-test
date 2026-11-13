import * as THREE from 'three';

export class MissionManager {
  constructor(scene, soundSystem, player, trafficManager, policeManager, buildings) {
    this.scene = scene;
    this.sound = soundSystem;
    this.player = player;
    this.trafficManager = trafficManager;
    this.policeManager = policeManager;
    this.buildings = buildings;

    this.activeMission = null;
    this.missionStage = 0;
    this.missionTimer = 0;
    this.objectiveMarker = null;

    this.availableMissions = [
      {
        id: 'mission1',
        title: 'THE GRAND THEFT AUTO',
        giver: 'Tony the Fixer',
        desc: 'Steal the prototype Banshee GT from the Downtown garage and lose the cops!',
        reward: 8000,
        stages: [
          { text: 'Go to Downtown Garage & steal the Banshee GT', target: new THREE.Vector3(-120, 14, -30), radius: 6 },
          { text: 'Lose the 2-Star Police Heat!', heat: 2, condition: 'lose_heat' },
          { text: 'Deliver the supercar to Tony\'s Chop Shop garage at the Docks', target: new THREE.Vector3(-140, 0.5, -140), radius: 8 }
        ]
      },
      {
        id: 'mission2',
        title: 'SYNDICATE DOCK AMBUSH',
        giver: 'Vito the Don',
        desc: 'Ambush rival syndicate guards at the industrial docks and seize their contraband cash briefcase!',
        reward: 15000,
        stages: [
          { text: 'Travel to the Industrial Shipping Docks', target: new THREE.Vector3(-130, 0.5, -120), radius: 10 },
          { text: 'Eliminate the 3 rival syndicate goons!', condition: 'kill_goons' },
          { text: 'Seize the cash briefcase and escape!', target: new THREE.Vector3(20, 0.5, 20), radius: 8 }
        ]
      },
      {
        id: 'mission3',
        title: 'NITRO SPEED RUN (BOMB VAN)',
        giver: 'Speedy Pete',
        desc: 'A bomb has been rigged! Maintain over 35 MPH and hit all 4 checkpoints before time runs out!',
        reward: 12000,
        timeLimit: 90,
        stages: [
          { text: 'Reach Checkpoint 1 on Ocean Boulevard (Keep Speed > 35 MPH!)', target: new THREE.Vector3(120, 0.5, 30), radius: 8 },
          { text: 'Reach Checkpoint 2 at Metropolis Center', target: new THREE.Vector3(0, 0.5, -80), radius: 8 },
          { text: 'Reach Checkpoint 3 at Ammu-Nation District', target: new THREE.Vector3(-45, 0.5, 115), radius: 8 },
          { text: 'Reach Checkpoint 4 at the Bomb Disposal Workshop!', target: new THREE.Vector3(115, 0.5, -120), radius: 8 }
        ]
      }
    ];

    this.createObjectiveMarker();
  }

  createObjectiveMarker() {
    // Glowing golden 3D waypoint beacon
    const group = new THREE.Group();

    // Cylinder beacon beam
    const beamGeo = new THREE.CylinderGeometry(1.6, 1.6, 40, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 20;
    group.add(beam);

    // Glowing ring on ground
    const ringGeo = new THREE.RingGeometry(1.2, 1.8, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffdd22, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.2;
    group.add(ring);

    this.scene.add(group);
    group.visible = false;
    this.objectiveMarker = group;
  }

  startMission(missionId) {
    const mission = this.availableMissions.find(m => m.id === missionId);
    if (!mission) return;

    this.activeMission = mission;
    this.missionStage = 0;
    this.missionTimer = mission.timeLimit || 0;

    this.setupCurrentStage();
    return mission;
  }

  setupCurrentStage() {
    if (!this.activeMission) return;
    const stage = this.activeMission.stages[this.missionStage];

    if (stage.heat) {
      this.policeManager.setWantedLevel(stage.heat);
    }

    if (stage.target) {
      this.objectiveMarker.position.copy(stage.target);
      this.objectiveMarker.visible = true;
    } else {
      this.objectiveMarker.visible = false;
    }
  }

  advanceStage() {
    this.missionStage++;
    this.sound.playCashSound();

    if (this.missionStage >= this.activeMission.stages.length) {
      this.completeMission();
    } else {
      this.setupCurrentStage();
    }
  }

  completeMission() {
    const mission = this.activeMission;
    this.player.addCash(mission.reward);
    this.sound.playMissionPassed();
    this.objectiveMarker.visible = false;
    this.activeMission = null;

    if (this.onMissionCompleted) {
      this.onMissionCompleted(mission);
    }
  }

  failMission(reason = 'Failed') {
    this.activeMission = null;
    this.objectiveMarker.visible = false;
    if (this.onMissionFailed) {
      this.onMissionFailed(reason);
    }
  }

  update(delta, playerPos, playerVehicle) {
    // Animate objective beacon beam
    if (this.objectiveMarker.visible) {
      this.objectiveMarker.rotation.y += delta * 1.5;
    }

    if (!this.activeMission) return;

    const stage = this.activeMission.stages[this.missionStage];

    // Speed check for Mission 3
    if (this.activeMission.id === 'mission3' && playerVehicle) {
      if (playerVehicle.physics.speed < 15) { // < ~35 MPH
        this.missionTimer -= delta * 2; // Detonator ticks down fast!
      }
      if (this.missionTimer <= 0) {
        playerVehicle.explode();
        this.failMission('THE BOMB DETONATED!');
        return;
      }
    }

    // Check target proximity
    if (stage.target && playerPos) {
      const dist = playerPos.distanceTo(stage.target);
      if (dist < (stage.radius || 6.0)) {
        this.advanceStage();
        return;
      }
    }

    // Check heat evasion stage
    if (stage.condition === 'lose_heat') {
      if (this.policeManager.wantedLevel === 0) {
        this.advanceStage();
        return;
      }
    }
  }

  getCurrentObjectiveText() {
    if (!this.activeMission) return null;
    const stage = this.activeMission.stages[this.missionStage];
    return stage ? stage.text : '';
  }

  getObjectiveDistance(playerPos) {
    if (!this.activeMission || !playerPos) return null;
    const stage = this.activeMission.stages[this.missionStage];
    if (stage && stage.target) {
      return Math.round(playerPos.distanceTo(stage.target));
    }
    return null;
  }
}

//Need to jointly include primitives3D.js
/*
Files that have been assumed to have been also loaded
primitives3d.js
*/

function MousePolarCamera(pixWidth, pixHeight, yfov) {
    //Coordinate system is defined as in OpenGL as a right
    //handed system with +z out of the screen, +x to the right,
    //and +y up
    //phi is CCW down from +y, theta is CCW away from +z
    this.type = "polar";
    this.pixWidth = pixWidth;
    this.pixHeight = pixHeight;
    this.yfov = yfov;
    this.center = glMatrix.vec3.fromValues(0, 0, 0);
    this.R = 1;
    this.theta = 0;
    this.phi = 0;
    this.towards = glMatrix.vec3.create();
    this.up = glMatrix.vec3.create();
    this.eye = glMatrix.vec3.create();
    
    this.updateVecsFromPolar = function() {
        var sinT = Math.sin(this.theta);
        var cosT = Math.cos(this.theta);
        var sinP = Math.sin(this.phi);
        var cosP = Math.cos(this.phi);
        //Make the camera look inwards
        //i.e. towards is -dP(R, phi, theta)/dR, where P(R, phi, theta) is polar position
        this.towards[0] = -sinP*cosT;
        this.towards[1] = -cosP;
        this.towards[2] = sinP*sinT;
        
        this.up[0] = -cosP*cosT;
        this.up[1] = sinP;
        this.up[2] = cosP*sinT;
        glMatrix.vec3.scaleAndAdd(this.eye, this.center, this.towards, this.R);    
    }
    
    this.centerOnBBox = function(bbox, theta, phi) {
        this.theta = (typeof theta !== 'undefined' ? theta : Math.PI/2);
        this.phi = (typeof phi !== 'undefined' ? phi : Math.PI/2);
        this.center = bbox.getCenter();
        this.R = bbox.getDiagLength()*1.5;
        if (this.R == 0) { //Prevent errors for the case of a single point or
        //mesh not loaded yet
            this.R = 1;
        }
        this.updateVecsFromPolar();
    }

    this.centerOnMesh = function(mesh) {
        var bbox = mesh.getBBox();
        this.centerOnBBox(bbox);
    }
    
/*    this.centerOnPointCloud = function(pcl):
        bbox = pcl.getBBox()
        this.centerOnBBox(bbox)*/

    this.getMVMatrix = function() {
        var sinT = Math.sin(this.theta);
        var cosT = Math.cos(this.theta);
        var sinP = Math.sin(this.phi);
        var cosP = Math.cos(this.phi);
        var camCenter = this.center;
        var camR = this.R;
        var T = glMatrix.vec3.fromValues(-sinP*cosT, -cosP, sinP*sinT); //Towards
        var U = glMatrix.vec3.fromValues(-cosP*cosT, sinP, cosP*sinT);  //Up
        var R = glMatrix.vec3.fromValues(-sinT, 0, -cosT);  //Right
        var eye = glMatrix.vec3.fromValues(camCenter[0] - camR*T[0], camCenter[1] - camR*T[1], camCenter[2] - camR*T[2]);
        var rotMat = glMatrix.mat4.create();
        rotMat[0] = R[0]; rotMat[1] = R[1]; rotMat[2] = R[2]; rotMat[3] = 0;
        rotMat[4] = U[0]; rotMat[5] = U[1]; rotMat[6] = U[2]; rotMat[7] = 0;
        rotMat[8] = -T[0]; rotMat[9] = -T[1]; rotMat[10] = -T[2]; rotMat[11] = 0;
        rotMat[12] = 0; rotMat[13] = 0; rotMat[14] = 0; rotMat[15] = 1;
        glMatrix.mat4.transpose(rotMat, rotMat);

        var transMat = glMatrix.mat4.create();
        glMatrix.vec3.scale(eye, eye, -1.0);
        glMatrix.mat4.translate(transMat, transMat, eye);
        var mvMatrix = glMatrix.mat4.create();
        glMatrix.mat4.mul(mvMatrix, rotMat, transMat);
        return mvMatrix;
    }
    
    this.orbitUpDown = function(dP) {
        dP = 4*dP/this.pixHeight;
        this.phi = this.phi+dP;
        this.updateVecsFromPolar();
    }
    
    this.orbitLeftRight = function(dT) {
        dT = 4*dT/this.pixWidth;
        this.theta = this.theta-dT;
        this.updateVecsFromPolar();
    }
    
    this.zoom = function(rate) {
        rate = rate / this.pixHeight;
        this.R = this.R*Math.pow(4, rate);
        this.updateVecsFromPolar();
    }
    
    this.translate = function(dx, dy) {
        var dR = glMatrix.vec3.create();
        glMatrix.vec3.sub(dR, this.center, this.eye);
        var length = glMatrix.vec3.length(dR)*Math.tan(this.yfov);
        var dx = length*dx / this.pixWidth;
        var dy = length*dy / this.pixHeight;
        var r = glMatrix.vec3.create();
        glMatrix.vec3.cross(r, this.towards, this.up);
        glMatrix.vec3.scaleAndAdd(this.center, this.center, r, -dx);
        glMatrix.vec3.scaleAndAdd(this.center, this.center, this.up, -dy);
        glMatrix.vec3.scaleAndAdd(this.eye, this.eye, r, -dx);
        glMatrix.vec3.scaleAndAdd(this.eye, this.eye, r, -dy);
        this.updateVecsFromPolar();
    }
    
    this.getPos = function() {
        return eye;
    }
    
    this.updateVecsFromPolar();
}


//For use with WASD + mouse bindings
function FPSCamera(pixWidth, pixHeight, yfov) {
    this.type = "fps";
    this.pixWidth = pixWidth;
    this.pixHeight = pixHeight;
    this.yfov = yfov;
    
    this.right = glMatrix.vec3.fromValues(1, 0, 0);
    this.up = glMatrix.vec3.fromValues(0, 1, 0);
    this.pos = glMatrix.vec3.fromValues(0, 0, 0);

    this.getMVMatrix = function() {
        //To keep right handed, make z vector -towards
        var T = glMatrix.vec3.create();
        glMatrix.vec3.cross(T, this.right, this.up);
        var rotMat = glMatrix.mat4.create();
        for (var i = 0; i < 3; i++) {
            rotMat[i*4] = this.right[i];
            rotMat[i*4+1] = this.up[i];
            rotMat[i*4+2] = T[i];
        }
        //glMatrix.mat4.transpose(rotMat, rotMat);
        var transMat = glMatrix.mat4.create();
        glMatrix.vec3.scale(this.pos, this.pos, -1.0);
        glMatrix.mat4.translate(transMat, transMat, this.pos);
        var mvMatrix = glMatrix.mat4.create();
        glMatrix.mat4.mul(mvMatrix, rotMat, transMat);
        glMatrix.vec3.scale(this.pos, this.pos, -1.0); //Have to move eye back
        return mvMatrix;
    }
    
    this.translate = function(dx, dy, dz, speed) {
        var T = glMatrix.vec3.create();
        glMatrix.vec3.cross(T, this.up, this.right);//Cross in opposite order so moving forward
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, this.right, dx*speed);
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, this.up, dy*speed);
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, T, dz*speed);
    }
    
    //Rotate the up direction around the right direction
    this.rotateUpDown = function(ud) {
        var thetaud = (Math.PI/2)*this.yfov*ud/this.pixHeight;
        var q = glMatrix.quat.create();
        glMatrix.quat.setAxisAngle(q, this.right, thetaud);
        glMatrix.vec3.transformQuat(this.up, this.up, q);
    }
    
    //Rotate the right direction around the up direction
    //but project onto the XY plane
    this.rotateLeftRight = function(lr) {
        var thetalr = (Math.PI/2)*lr/this.pixWidth;
        var q = glMatrix.quat.create();
        glMatrix.quat.setAxisAngle(q, this.up, thetalr);
        glMatrix.vec3.transformQuat(this.right, this.right, q);
        //Snap to the XY plane to keep things from getting wonky
        this.right[1] = 0;
        glMatrix.vec3.normalize(this.right, this.right);
        //Make sure the up vector is still orthogonal
        var dot = glMatrix.vec3.dot(this.right, this.up);
        glMatrix.vec3.scaleAndAdd(this.up, this.up, this.right, -dot);
        glMatrix.vec3.normalize(this.up, this.up);
    }
    
    this.outputString = function() {
        console.log(glMatrix.vec3.str(this.pos) + ": " + glMatrix.vec3.str(this.towards) + " x " + glMatrix.vec3.str(this.up));
    }
}
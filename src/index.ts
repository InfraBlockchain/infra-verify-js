import { decodeJWT } from 'did-jwt';
import { verifyPresentation, verifyCredential, VerifiablePresentation, VerifiableCredential } from 'did-jwt-vc';
import { Resolver } from 'did-resolver';
import { getResolver, ConfigurationOptions } from 'infra-did-resolver';
import InfraDID from 'infra-did-js';

export interface VerifierConfig {
    resolver?: any
    networkConfig: ConfigurationOptions
    did: string
    knownIssuers: Issuer[]
}

export type JWT = string
export type DID = string
export type Issuer = {
    id: string,
    did: DID
}

export default class Verifier {
    public resolver: any
    public challenge: string
    public did: string
    public knownIssuers: Issuer[]

    constructor (config : VerifierConfig) {
        this.resolver = config.resolver ? config.resolver : new Resolver(getResolver(config.networkConfig));
        this.did = config.did ? config.did : InfraDID.createPubKeyDIDsecp256k1('01').did;
        this.challenge = '';
        this.knownIssuers = config.knownIssuers;
    }

    public ready() : { challenge: string, aud: string } {
        this.challenge = this.generateChallenge();
        return { challenge: this.challenge, aud: this.did };
    }

    private generateChallenge() : string {
        // use randomly generated DID as nonce for now
        return InfraDID.createPubKeyDIDsecp256k1('01').did;
    }

    public getVPClaims(vp: JWT) : any {
        const vcList = decodeJWT(vp).payload.vp.verifiableCredential;
        return vcList.map((vc : JWT) => {
            return this.getVCClaims(vc);
        }).reduce((result : any, claims : any) => {
            return { ...claims, ...result }
        }, {});
    }

    public getVCClaims(vc: JWT) : any {
        return decodeJWT(vc).payload.vc.credentialSubject;
    }

    public async isValid(jwt: JWT) : Promise<boolean> {
        const decoded = decodeJWT(jwt);
        if (decoded.payload.vp) return this.isValidVP(jwt);
        else if (decoded.payload.vc) return this.isValidVC(jwt);
        else throw new Error (`Unsupported type`);
    }

    public async isValidVP (vp: JWT) : Promise<boolean> {
        // verify VP has been issued to the verifier with correct challenge
        const verifiedPresentation = await verifyPresentation(vp, this.resolver, { challenge: this.challenge, audience: this.did })
        const vcList = verifiedPresentation.payload.vp.VerifiedCredential;
        const signer = verifiedPresentation.payload.signer;
        if (this.isRevoked(signer.did)) throw new Error (`Deactivated Presenter`);
        return vcList.map((vc : JWT) => {
            return this.isValidVC(vc, signer.did);
        }, this).reduce((result : boolean, validity : boolean) => {
            return result && validity
        }, true)
    }

    public async isValidVC (vc: JWT, holder?: DID) : Promise<boolean> {
        // verify VC has NOT been tampered
        const verifiedCredential = await verifyCredential(vc, this.resolver);
        if (holder && verifiedCredential.payload.sub !== holder) throw new Error (`Signer is not the subject of VC`);

        // verify the issuer identity is valid
        if (!this.isKnownIssuer(verifiedCredential.issuer)) throw new Error (`Unknown Issuer`);
        
        // verify the issuer identity has NOT been revoked
        const revokedIssuer = await this.isRevoked(verifiedCredential.issuer);
        if (revokedIssuer) throw new Error (`Deactivated Issuer`);
        
        // check if VC ID exists
        const vcID = verifiedCredential.payload.vc.id;
        if (!vcID) throw new Error (`Invalid VC format: VC id does not exist`)

        // verify the VC has NOT been revoked
        const revokedVC = await this.isRevoked(vcID);
        if (revokedVC) throw new Error (`Revoked VC`);

        return true;
    }

    public async isRevoked(did : DID) : Promise<boolean> {
        const didDoc = await this.resolver.resolve(did);
        if (didDoc.didResolutionMetadata.error) throw `DID Resolved Metadata: ${didDoc.didResolutionMetadata.error}, for DID: ${did}`;
        if (!didDoc.didDocument) throw `DID Resolve Failed: No document resolved, DID: ${did}`;
        if (didDoc.didDocumentMetadata.deactivated) return true;
        return false;
    }

    public isKnownIssuer(issuer : DID) : boolean {
        const found = this.knownIssuers.some(known => known.did === issuer)
        if (!found) return false
        return true
    }
}
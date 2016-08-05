/*!
TypedXML v0.2.0 - https://github.com/Britz/TypedXML

Typed XML parsing and serializing that preserves type information. Parse XML into actual class instances. Recommended (but not required)
to be used with reflect-metadata (global installation): https://github.com/rbuckton/ReflectDecorators. 


The MIT License (MIT)
Copyright (c) 2016 Jochen Britz

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const METADATA_FIELD_KEY = "__typedXmlXmlObjectMetadataInformation__";

declare type Constructor<T> = { new (): T };

declare abstract class Reflect {
    public static getMetadata(metadataKey: string, target: any, targetKey: string | symbol): any;
}

interface SerializerSettings {
    /** Property key to recognize as type-hints. Default is "__type". */
    typeHintPropertyKey?: string;

    /** When set, enable emitting and recognizing type-hints. Default is true */
    enableTypeHints?: boolean;
    
    /** Maximum number of objects allowed when deserializing from JSON. Default is no limit. */
    maxObjects?: number;

    /** A function that transforms the JSON after serializing. Called recursively for every object. */
    replacer?: (key: string, value: any) => any;

    /** A function that transforms the JSON before deserializing. Called recursively for every object. */
    reviver?: (key: any, value: any) => any;
}

//#region "Helpers"
namespace Helpers {
    /**
     * Polyfill for Object.assign.
     * @param target The target object.
     * @param sources The source object(s).
     */
    export function assign<T extends Object>(target: T, ...sources: Array<any>): T {
        var output: T;
        var source: any;

        if (target === undefined || target === null) {
            throw new TypeError("Cannot convert undefined or null to object");
        }

        output = Object(target);
        
        for (var i = 1; i < arguments.length; i++) {
            source = arguments[i];

            if (source !== undefined && source !== null) {
                for (var nextKey in source) {
                    if (source.hasOwnProperty(nextKey)) {
                        output[nextKey] = source[nextKey];
                    }
                }
            }
        }

        return output;
    }

    /**
     * Gets the string representation of a class.
     * @param target The class (constructor function) reference.
     */
    export function getClassName(target: Constructor<any>): string;
    /**
     * Gets a string representation of a class from its prototype.
     * @param target The class prototype.
     */
    export function getClassName(target: Object): string;
    export function getClassName(target: Constructor<any> | Object): string {
        var targetType: Constructor<any>;

        if (typeof target === "function") {
            // target is constructor function.
            targetType = target as Constructor<any>;
        } else if (typeof target === "object") {
            // target is class prototype.
            targetType = target.constructor as Constructor<any>;
        }

        if (!targetType) {
            return "undefined";
        }

        if ("name" in targetType && typeof (targetType as any).name === "string") {
            // ES6 constructor.name // Awesome!
            return (targetType as any).name;
        } else {
            // Extract class name from string representation of constructor function. // Meh...
            return targetType.toString().match(/function (\w*)/)[1];
        }
    }

    export function getDefaultValue<T>(type: { new (): T }): T {
        switch (type as any) {
            case Number:
                return 0 as any;

            case String:
                return "" as any;

            case Boolean:
                return false as any;

            case Array:
                return [] as any;

            default:
                return null;
        }
    }
    
    export function getPropertyDisplayName(target: Constructor<any> | Object, propertyKey: string | symbol) {
        return `${getClassName(target)}.${propertyKey.toString()}`;
    }
    
    export function isArray(object: any) {
        if (typeof Array.isArray === "function") {
            return Array.isArray(object);
        } else {
            if (object instanceof Array) {
                return true;
            } else {
                return false;
            }
        }
    }

    export function isPrimitive(obj: any) {
        switch (typeof obj) {
            case "string":
            case "number":
            case "boolean":
                return true;
        }

        if (obj instanceof String || obj === String ||
            obj instanceof Number || obj === Number ||
            obj instanceof Boolean || obj === Boolean
        ) {
            return true;
        }

        return false;
    }

    export function isReservedMemberName(name: string) {
        return (name === METADATA_FIELD_KEY);
    }

    export function isSubtypeOf(A: Constructor<any>, B: Constructor<any>) {
        var aPrototype = A.prototype;

        // "A" is a class.
        if (A === B) {
            return true;
        }

        while (aPrototype) {
            if (aPrototype instanceof B) {
                return true;
            }

            aPrototype = aPrototype.prototype;
        }

        return false;
    }

   
    /**
     * Copy the values of all enumerable own properties from one or more source objects to a shallow copy of the target object.
     * It will return the new object.
     * @param target The target object.
     * @param sources The source object(s).
     */
    export function merge<T extends Object>(target: T, ...sources: Array<any>): T {
        var output: T;
        var source: any;

        if (target === undefined || target === null) {
            throw new TypeError("Cannot convert undefined or null to object");
        }

        output = {} as T;

        Object.keys(target).forEach(nextKey => {
            output[nextKey] = target[nextKey];
        });

        for (var i = 1; i < arguments.length; i++) {
            source = arguments[i];

            if (source !== undefined && source !== null) {
                for (var nextKey in source) {
                    if (source.hasOwnProperty(nextKey)) {
                        output[nextKey] = source[nextKey];
                    }
                }
            }
        }

        return output;
    }

    export function valueIsDefined(value: any): boolean {
        if (typeof value === "undefined" || value === null) {
            return false;
        } else {
            return true;
        }
    }

}
//#endregion

//#region "Logger"
namespace Logger {

     export function log(message?: any, ...optionalParams: Array<any>) {
        if (typeof console === "object" && typeof console.log === "function") {
            console.log.apply(console, [message].concat(optionalParams));
        }
    }

    export function warn(message?: any, ...optionalParams: Array<any>) {
        if (typeof console === "object" && typeof console.warn === "function") {
            console.warn.apply(console, [message].concat(optionalParams));
        } else if (typeof console === "object" && typeof console.log === "function") {
            console.log.apply(console, ["WARNING: " + message].concat(optionalParams));
        }
    }

     export function error(message?: any, ...optionalParams: Array<any>) {
        if (typeof console === "object" && typeof console.error === "function") {
            console.error.apply(console, [message].concat(optionalParams));
        } else if (typeof console === "object" && typeof console.log === "function") {
            console.log.apply(console, ["ERROR: " + message].concat(optionalParams));
        }
    }

}

//#region "Metadata"
class XMLParamterMetadata<T> {
    /** If set, a default value will be emitted for uninitialized members. */
    public emitDefaultValue: boolean;

    /** Member name as it appears in the serialized JSON. */
    public name: string;

    /** Property or field key of the xml member. */
    public key: string;

    /** Constuctor (type) reference of the member. */
    public type: Constructor<T>;

    /** If set, indicates that the member must be present when deserializing. */
    public isRequired: boolean;

    /** Serialization/deserialization order. */
    public order: number;

    public forceEnableTypeHinting: boolean;
}

class XMLMemberMetadata<T> extends XMLParamterMetadata<T> {
  
    /** If the xml member is an array, sets options of array elements. */
    public elements: XMLMemberMetadata<any>;

    /** If the xml member is an array, sets options of array elements. */
    
    public allow: boolean;
}

class XMLObjectMetadata<T> {
    private _className: string;
    private _dataMembers: { [key: string]: XMLMemberMetadata<any> };
    private _knownTypes: Array<Constructor<any>>;
    private _knownTypeCache: { [key: string]: Constructor<any> };

    /**
     * Gets the name of a class as it appears in a serialized JSON string.
     * @param type The XMLObject class.
     * @param inherited Whether to use inherited metadata information from base classes (if own metadata does not exist).
     */
    public static getXMLObjectName(type: Constructor<any>, inherited: boolean = true): string {
        var metadata = this.getFromType(type, inherited);

        if (metadata !== null) {
            return metadata.className;
        } else {
            return Helpers.getClassName(type);
        }
    }

    /**
     * Gets XMLObject metadata information from a class or its prototype.
     * @param target The target class.
     * @param inherited Whether to use inherited metadata information from base classes (if own metadata does not exist).
     * @see https://jsfiddle.net/m6ckc89v/ for demos related to the special inheritance case when 'inherited' is set.
     */
    public static getFromType<S>(target: { new (): S }, inherited?: boolean): XMLObjectMetadata<S>;
    
    /**
     * Gets XMLObject metadata information from a class or its prototype.
     * @param target The target prototype.
     * @param inherited Whether to use inherited metadata information from base classes (if own metadata does not exist).
     * @see https://jsfiddle.net/m6ckc89v/ for demos related to the special inheritance case when 'inherited' is set.
     */
    public static getFromType(target: any, inherited?: boolean): XMLObjectMetadata<any>;

    public static getFromType<S>(target: { new (): S } | any, inherited: boolean = true): XMLObjectMetadata<S> {
        var targetPrototype: any;
        var metadata: XMLObjectMetadata<S>;

        if (typeof target === "function") {
            targetPrototype = target.prototype;
        } else {
            targetPrototype = target;
        }

        if (!targetPrototype) {
            return null;
        }

        if (targetPrototype.hasOwnProperty(METADATA_FIELD_KEY)) {
            // The class prototype contains own XMLObject metadata.
            metadata = targetPrototype[METADATA_FIELD_KEY];
        } else if (inherited && targetPrototype[METADATA_FIELD_KEY]) {
            // The class prototype inherits XMLObject metadata.
            metadata = targetPrototype[METADATA_FIELD_KEY];
        }

        if (metadata && metadata.isExplicitlyMarked) {
            // Ignore implicitly added XMLObject.
            return metadata;
        } else {
            return null;
        }
    }

    /**
     * Gets XMLObject metadata information from a class instance.
     * @param target The target instance.
     * @param inherited Whether to use inherited metadata information from base classes (if own metadata does not exist).
     * @see https://jsfiddle.net/m6ckc89v/ for demos related to the special inheritance case when 'inherited' is set.
     */
    public static getFromInstance<S>(target: S, inherited: boolean = true): XMLObjectMetadata<S> {
        return this.getFromType<S>(Object.getPrototypeOf(target), inherited);
    }

    /**
     * Gets the known type name of a XMLObject class for type hint.
     * @param target The target class.
     */
    public static getKnownTypeNameFromType<S>(target: Constructor<S>): string {
        var metadata = this.getFromType<S>(target, false);

        if (metadata) {
            return metadata.className;
        } else {
            return Helpers.getClassName(target);
        }
    }

    /**
     * Gets the known type name of a XMLObject instance for type hint.
     * @param target The target instance.
     */
    public static getKnownTypeNameFromInstance<S>(target: S): string {
        var metadata = this.getFromInstance<S>(target, false);

        if (metadata) {
            return metadata.className;
        } else {
            return Helpers.getClassName(target.constructor);
        }
    }

    /** Gets the metadata of all XMLMembers of the XMLObject as key-value pairs. */
    public get dataMembers(): { [key: string]: XMLMemberMetadata<any> } {
        return this._dataMembers;
    }

    /** Gets or sets the constructor function for the XMLObject. */
    public classType: Constructor<T>;

    /** Gets or sets the name of the XMLObject as it appears in the serialized JSON. */
    public get className(): string {
        if (typeof this._className === "string") {
            return this._className;
        } else {
            return Helpers.getClassName(this.classType);
        }
    }
    public set className(value: string) {
        this._className = value;
    }

    /** Gets a key-value collection of the currently known types for this XMLObject. */
    public get knownTypes() {
        var knownTypes: { [key: string]: Constructor<any> };
        var knownTypeName: string;

        if (false && this._knownTypeCache) {
            return this._knownTypeCache;
        } else {
            knownTypes = {};

            this._knownTypes.forEach((knownType) => {
                // KnownType names are not inherited from XMLObject settings, as it would render them useless.
                knownTypeName = XMLObjectMetadata.getKnownTypeNameFromType(knownType);

                knownTypes[knownTypeName] = knownType;
            });

            this._knownTypeCache = knownTypes;

            return knownTypes;
        }
    }

    public isExplicitlyMarked: boolean;
    public initializer: (xml: any) => T;
    public serializer: (object: T) => any;

    constructor() {
        this._dataMembers = {};
        this._knownTypes = [];
        this._knownTypeCache = null;
        this.isExplicitlyMarked = false;
    }

    /**
     * Sets a known type.
     * @param type The known type.
     */
    public setKnownType(type: Constructor<any>): void {
        if (this._knownTypes.indexOf(type) === -1) {
            this._knownTypes.push(type);
            this._knownTypeCache = null;
        }
    }

    /**
     * Adds a XMLMember to the XMLObject.
     * @param member The XMLMember metadata.
     * @throws Error if a XMLMember with the same name already exists.
     */
    public addMember<U>(member: XMLMemberMetadata<U>) {
        Object.keys(this._dataMembers).forEach(propertyKey => {
            if (this._dataMembers[propertyKey].name === member.name) {
                throw new Error(`A member with the name '${member.name}' already exists.`);
            }
        });

        this._dataMembers[member.key] = member;
    }

    /**
     * Sorts data members:
     *  1. Ordered members in defined order
     *  2. Unordered members in alphabetical order
     */
    public sortMembers(): void {
        var memberArray: XMLMemberMetadata<any>[] = [];

        Object.keys(this._dataMembers).forEach((propertyKey) => {
            memberArray.push(this._dataMembers[propertyKey]);
        });

        memberArray = memberArray.sort(this.sortMembersCompare);

        this._dataMembers = {};

        memberArray.forEach((dataMember) => {
            this._dataMembers[dataMember.key] = dataMember;
        });
    }

    private sortMembersCompare(a: XMLMemberMetadata<any>, b: XMLMemberMetadata<any>) {
        if (typeof a.order !== "number" && typeof b.order !== "number") {
            // a and b both both implicitly ordered, alphabetical order
            if (a.name < b.name) {
                return -1;
            } else if (a.name > b.name) {
                return 1;
            }
        } else if (typeof a.order !== "number") {
            // a is implicitly ordered, comes after b (compare: a is greater)
            return 1;
        } else if (typeof b.order !== "number") {
            // b is implicitly ordered, comes after a (compare: b is greater)
            return -1;
        } else {
            // a and b are both explicitly ordered
            if (a.order < b.order) {
                return -1;
            } else if (a.order > b.order) {
                return 1;
            } else {
                // ordering is the same, use alphabetical order
                if (a.name < b.name) {
                    return -1;
                } else if (a.name > b.name) {
                    return 1;
                }
            }
        }

        return 0;
    }
}
//#endregion

//#region "XMLObject"
interface XMLObjectOptions<T> {
    /** Name of the object as it appears in the serialized JSON. */
    name?: string;

    /** An array of known types to recognize when encountering type-hints. */
    knownTypes?: Array<{ new (): any }>;

    /** A custom serializer function transforming an instace to a JSON object. */
    serializer?: (object: T) => any;

    /** A custom deserializer function transforming a JSON object to an instace. */
    initializer?: (xml: any) => T;
}

/**
 * Specifies that the type is serializable to and deserializable from a JSON string.
 * @param options Configuration settings.
 */
function XMLObject<T>(options?: XMLObjectOptions<T>): (target: { new (): T }) => void;

/**
 * Specifies that the type is serializable to and deserializable from a JSON string.
 */
function XMLObject<T>(target: { new (): T }): void;

function XMLObject<T>(optionsOrTarget?: XMLObjectOptions<T> | { new (): T }): (target: Constructor<T>) => void | void {
    var options: XMLObjectOptions<T>;

    if (typeof optionsOrTarget === "function") {
        // XMLObject is being used as a decorator, directly.
        options = {};
    } else {
        // XMLObject is being used as a decorator factory.
        options = optionsOrTarget || {};
    }

    var initializer = options.initializer;
    var decorator = function (target: Constructor<T>): void {
        var objectMetadata: XMLObjectMetadata<T>;
        var parentMetadata: XMLObjectMetadata<T>;
        var i;

        if (!target.prototype.hasOwnProperty(METADATA_FIELD_KEY)) {
            objectMetadata = new XMLObjectMetadata<T>();

            // If applicable, inherit @XMLMembers and @KnownTypes from parent @XMLObject.
            if (parentMetadata = target.prototype[METADATA_FIELD_KEY]) {
                // @XMLMembers
                Object.keys(parentMetadata.dataMembers).forEach(memberPropertyKey => {
                    objectMetadata.dataMembers[memberPropertyKey] = parentMetadata.dataMembers[memberPropertyKey];
                });

                // @KnownTypes
                Object.keys(parentMetadata.knownTypes).forEach(key => {
                    objectMetadata.setKnownType(parentMetadata.knownTypes[key]);
                });
            }

            Object.defineProperty(target.prototype, METADATA_FIELD_KEY, {
                enumerable: false,
                configurable: false,
                writable: false,
                value: objectMetadata
            });
        } else {
            objectMetadata = target.prototype[METADATA_FIELD_KEY];
        }

        objectMetadata.classType = target;
        objectMetadata.isExplicitlyMarked = true;

        if (options.name) {
            objectMetadata.className = options.name;
        }

        if (options.knownTypes) {
            i = 0;

            try {
                options.knownTypes.forEach(knownType => {
                    if (typeof knownType === "undefined") {
                        throw new TypeError(`Known type #${i++} is undefined.`);
                    }

                    objectMetadata.setKnownType(knownType);
                });
            } catch (e) {
                // The missing known type might not cause trouble at all, thus the error is printed, but not thrown.
                Logger.error(new TypeError(`@XMLObject: ${e.message} (on '${Helpers.getClassName(target)}')`));
            }
        }

        if (typeof initializer === "function") {
            objectMetadata.initializer = initializer;
        }
    };

    if (typeof optionsOrTarget === "function") {
        // XMLObject is being used as a decorator, directly.
        return decorator(optionsOrTarget as Constructor<T>) as any;
    } else {
        // XMLObject is being used as a decorator factory.
        return decorator;
    }
}
//#endregion

//#region "XMLMember"
interface XMLMemberOptions<TFunction extends Function> {
    /** Sets the member name as it appears in the serialized JSON. Default value is determined from property key. */
    name?: string;

    /** Sets the xml member type. Optional if reflect metadata is available. */
    type?: TFunction;

    /** Deprecated. When the xml member is an array, sets the type of array elements. Required for arrays. */
    elementType?: Function;

    /** When the xml member is an array, sets the type of array elements. Required for arrays. */
    elements?: XMLMemberOptions<any> | Function;

    /** When set, indicates that the member must be present when deserializing a JSON string. */
    isRequired?: boolean;

    /** Sets the serialization and deserialization order of the xml member. */
    order?: number;

    /** When set, a default value is emitted when an uninitialized member is serialized. */
    emitDefaultValue?: boolean;

    /** When set, type-hint is mandatory when deserializing. Set for properties with interface or abstract types/element-types. */
    refersAbstractType?: boolean;
}

function xmlMemberTypeInit<T>(metadata: XMLMemberMetadata<T>, propertyName: string, warnArray = false) {
    if (metadata.elements) {
        // 'elements' type shorthand.
        if (typeof metadata.elements === "function") {
            // Type shorthand was used.
            metadata.elements = {
                type: metadata.elements
            } as any;
        }

        if (!metadata.type) {
            // If the 'elements' option is set, 'type' is automatically assumed to be 'Array' unless specified.
            metadata.type = Array as any;
        }
    }

    if (metadata.type as any === Array) {
        if (!metadata.elements) {
            if (warnArray) {
                // Provide backwards compatibility.
                Logger.warn(`No valid 'elements' option was specified for '${propertyName}'.`);
            } else {
                throw new Error(`No valid 'elements' option was specified for '${propertyName}'.`);
            }
        } else {
            xmlMemberTypeInit(metadata.elements, propertyName + '[]', true);
        }
    }

    if (typeof metadata.type !== "function") {
        throw new Error(`No valid 'type' option was specified for '${propertyName}'.`);
    }
}

function xmlMemberKnownTypes<T>(metadata: XMLMemberMetadata<T>) {
    var knownTypes = new Array<{ new (): any }>();

    knownTypes.push(metadata.type);

    if (metadata.elements) {
        knownTypes = knownTypes.concat(xmlMemberKnownTypes(metadata.elements));
    }

    return knownTypes;
}

/**
 * Specifies that the property is part of the object when serializing.
 * Parameterless use requires reflect-metadata to determine member type.
 */
function XMLMember(): PropertyDecorator;

/**
 * Specifies that the property is part of the object when serializing.
 * Parameterless use requires reflect-metadata to determine member type.
 */
function XMLMember(target: any, propertyKey: string | symbol): void;

/**
 * Specifies that the property is part of the object when serializing.
 * @param options Configuration settings.
 */
function XMLMember<TFunction extends Function>(options: XMLMemberOptions<TFunction>): PropertyDecorator;

function XMLMember<TFunction extends Function>(optionsOrTarget?: XMLMemberOptions<TFunction> | any, propertyKey?: string | symbol): PropertyDecorator | void {
    var memberMetadata = new XMLMemberMetadata<TFunction>();
    var options: XMLMemberOptions<TFunction>;
    var decorator: PropertyDecorator;

    if (typeof propertyKey === "string" || typeof propertyKey === "symbol") {
        // XMLMember is being used as a decorator, directly.
        options = {};
    } else {
        // XMLMember is being used as a decorator factory.
        options = optionsOrTarget || {};
    }

    decorator = function (target: any, propertyKey: string | symbol): void {
        var descriptor = Object.getOwnPropertyDescriptor(target, propertyKey.toString());;
        var objectMetadata: XMLObjectMetadata<any>;
        var parentMetadata: XMLObjectMetadata<any>;
        var reflectType: any;
        var propertyName = Helpers.getPropertyDisplayName(target, propertyKey); // For error messages.
        
        // When a property decorator is applied to a static member, 'target' is a constructor function.
        // See: https://github.com/Microsoft/TypeScript-Handbook/blob/master/pages/Decorators.md#property-decorators
        // And static members are not supported.
        if (typeof target === "function") {
            throw new TypeError(`@XMLMember cannot be used on a static property ('${propertyName}').`);
        }

        // Methods cannot be serialized.
        if (typeof target[propertyKey] === "function") {
            throw new TypeError(`@XMLMember cannot be used on a method property ('${propertyName}').`);
        }

        // 'elementType' is deprecated, but still provide backwards compatibility for now.
        if (options.hasOwnProperty("elementType")) {
            Logger.warn(`${propertyName}: the 'elementType' option is deprecated, use 'elements' instead.`);
            options.elements = options.elementType;

            if (options.elementType === Array) {
                memberMetadata.forceEnableTypeHinting = true;
            }
        }

        memberMetadata = Helpers.assign(memberMetadata, options);

        memberMetadata.key = propertyKey.toString();
        memberMetadata.name = options.name || propertyKey.toString(); // Property key is used as default member name if not specified.

        // Check for reserved member names.
        if (Helpers.isReservedMemberName(memberMetadata.name)) {
            throw new Error(`@XMLMember: '${memberMetadata.name}' is a reserved name.`);
        }

        // It is a common error for types to exist at compile time, but not at runtime (often caused by improper/misbehaving imports).
        if (options.hasOwnProperty("type") && typeof options.type === "undefined") {
            throw new TypeError(`@XMLMember: 'type' of '${propertyName}' is undefined.`);
        }

        // ReflectDecorators support to auto-infer property types.
        //#region "Reflect Metadata support"
        if (typeof Reflect === "object" && typeof Reflect.getMetadata === "function") {
            reflectType = Reflect.getMetadata("design:type", target, propertyKey);

            if (typeof reflectType === "undefined") {
                // If Reflect.getMetadata exists, functionality for *setting* metadata should also exist, and metadata *should* be set.
                throw new TypeError(`@XMLMember: type detected for '${propertyName}' is undefined.`);
            }

            if (!memberMetadata.type || typeof memberMetadata.type !== "function") {
                // Get type information using reflect metadata.
                memberMetadata.type = reflectType;
            } else if (memberMetadata.type !== reflectType) {
                Logger.warn(`@XMLMember: 'type' specified for '${propertyName}' does not match detected type.`);
            }
        }
        //#endregion "Reflect Metadata support"

        // Ensure valid types have been specified ('type' at all times, 'elements' for arrays).
        xmlMemberTypeInit(memberMetadata, propertyName);
        
        // Add XMLObject metadata to 'target' if not yet exists ('target' is the prototype).
        // NOTE: this will not fire up custom serialization, as 'target' must be explicitly marked with '@XMLObject' as well.
        if (!target.hasOwnProperty(METADATA_FIELD_KEY)) {
            // No *own* metadata, create new.
            objectMetadata = new XMLObjectMetadata();
            
            // Inherit @XMLMembers from parent @XMLObject, if any.
            if (parentMetadata = target[METADATA_FIELD_KEY]) {
                Object.keys(parentMetadata.dataMembers).forEach(memberPropertyKey => {
                    objectMetadata.dataMembers[memberPropertyKey] = parentMetadata.dataMembers[memberPropertyKey];
                });
            }

            // ('target' is the prototype of the involved class, metadata information is added to the class prototype).
            Object.defineProperty(target, METADATA_FIELD_KEY, {
                enumerable: false,
                configurable: false,
                writable: false,
                value: objectMetadata
            });
        } else {
            // XMLObjectMetadata already exists on 'target'.
            objectMetadata = target[METADATA_FIELD_KEY];
        }
        
        // Automatically add known types.
        xmlMemberKnownTypes(memberMetadata).forEach(knownType => {
            objectMetadata.setKnownType(knownType);
        });
        
        // Register @XMLMember with @XMLObject (will override previous member when used multiple times on same property).
        try {
            objectMetadata.addMember(memberMetadata);
        } catch (e) {
            throw new Error(`Member '${memberMetadata.name}' already exists on '${Helpers.getClassName(objectMetadata.classType)}'.`);
        }
    };

    if (typeof propertyKey === "string" || typeof propertyKey === "symbol") {
        // XMLMember is being used as a decorator, call decorator function directly.
        return decorator(optionsOrTarget, propertyKey);
    } else {
        // XMLMember is being used as a decorator factory, return decorator function.
        return decorator;
    }
}
//#endregion

//#region "Serializer"
interface WriteSettings {
    objectType: { new (): any },
    elements?: XMLMemberMetadata<any>,
    emitDefault?: boolean,
    typeHintPropertyKey: string,
    enableTypeHints?: boolean,
    requireTypeHints?: boolean,
    name?: string
}

abstract class Serializer {
    public static writeObject(object: any, settings: SerializerSettings): string {
        var objectMetadata = XMLObjectMetadata.getFromInstance(object);
        var ObjectType: any;

        if (objectMetadata) {
            ObjectType = objectMetadata.classType;
        } else {
            ObjectType = object.constructor;
        }

        return JSON.stringify(this.writeToXMLObject(object, {
            objectType: ObjectType,
            enableTypeHints: settings.enableTypeHints,
            typeHintPropertyKey: settings.typeHintPropertyKey
        }), settings.replacer);
    }

    /**
     * Convert a @XMLObject class instance to a JSON object for serialization.
     * @param object The instance to convert.
     * @param settings Settings defining how the instance should be serialized.
     */
    private static writeToXMLObject<T>(object: T, settings: WriteSettings): any {
        var xml: any;
        var objectMetadata: XMLObjectMetadata<T>;
        
        if (object === null || typeof object === "undefined") {
            // Uninitialized or null object returned "as-is" (or default value if set).
            if (settings.emitDefault) {
                xml = Helpers.getDefaultValue(settings.objectType);
            } else {
                xml = object;
            }
        } else if (Helpers.isPrimitive(object) || object instanceof Date) {
            // Primitive types and Date stringified "as-is".
            xml = object;
        } else if (object instanceof Array) {
            xml = [];
            
            for (var i = 0, n = (object as any).length; i < n; i++) {
                xml.push(this.writeToXMLObject(object[i], {
                    elements: settings.elements ? settings.elements.elements : null,
                    enableTypeHints: settings.enableTypeHints,
                    objectType: settings.elements ? settings.elements.type : Object,
                    requireTypeHints: settings.requireTypeHints,
                    typeHintPropertyKey: settings.typeHintPropertyKey
                }));
            }
        } else {
            // Object with properties.
            objectMetadata = XMLObjectMetadata.getFromInstance(object)
            
            if (objectMetadata && typeof objectMetadata.serializer === "function") {
                xml = objectMetadata.serializer(object);
            } else {
                xml = {};

                // Add type-hint.
                if (settings.enableTypeHints && (settings.requireTypeHints || object.constructor !== settings.objectType)) {
                    xml[settings.typeHintPropertyKey] = XMLObjectMetadata.getKnownTypeNameFromInstance(object);
                }

                if (objectMetadata) {
                    // Serialize @XMLMember properties.
                    objectMetadata.sortMembers();

                    Object.keys(objectMetadata.dataMembers).forEach(propertyKey => {
                        var propertyMetadata = objectMetadata.dataMembers[propertyKey];

                        xml[propertyMetadata.name] = this.writeToXMLObject(object[propertyKey], {
                            elements: propertyMetadata.elements,
                            emitDefault: propertyMetadata.emitDefaultValue,
                            enableTypeHints: settings.enableTypeHints,
                            name: propertyMetadata.name,
                            objectType: propertyMetadata.type,
                            requireTypeHints: settings.requireTypeHints,
                            typeHintPropertyKey: settings.typeHintPropertyKey
                        });
                    });
                } else {
                    // Serialize all own properties.
                    Object.keys(object).forEach(propertyKey => {
                        xml[propertyKey] = this.writeToXMLObject(object[propertyKey], {
                            enableTypeHints: settings.enableTypeHints,
                            objectType: Object,
                            requireTypeHints: settings.requireTypeHints,
                            typeHintPropertyKey: settings.typeHintPropertyKey
                        });
                    });
                }
            }
        }

        return xml;
    }
}
//#endregion

//#region "Deserializer"
interface ReadSettings<T> {
    objectType: { new (): T },
    isRequired?: boolean,
    elements?: XMLMemberMetadata<any>,
    typeHintPropertyKey: string,
    enableTypeHints?: boolean,
    knownTypes?: { [name: string]: { new (): any } },
    requireTypeHints?: boolean;
    strictTypeHintMode?: boolean;
}

abstract class Deserializer {
    /**
     * Deserialize a JSON string into the provided type.
     * @param xml The JSON string to deserialize.
     * @param type The type to deserialize into.
     * @param settings Serializer settings.
     * @throws Error if 'settings' specifies 'maxObjects', and the JSON string exceeds that limit.
     */
    public static readObject<T>(xml: string, type: { new (): T }, settings: SerializerSettings): T {
        var value: any;
        var instance: T;
        var metadata = XMLObjectMetadata.getFromType(type);

        value = JSON.parse(xml, settings.reviver); // Parse text into basic object, which is then processed recursively.
        
        if (typeof settings.maxObjects === "number") {
            if (this.countObjects(value) > settings.maxObjects) {
                throw new Error(`JSON exceeds object count limit (${settings.maxObjects}).`);
            }
        }
        
        instance = this.readXMLToInstance(value, {
            objectType: type,
            typeHintPropertyKey: settings.typeHintPropertyKey,
            enableTypeHints: settings.enableTypeHints,
            strictTypeHintMode: true,
            knownTypes: metadata ? metadata.knownTypes : {}
        });

        return instance;
    }

    private static countObjects(value: any): number {
        switch (typeof value) {
            case "object":
                if (value === null) {
                    return 0;
                } else if (Helpers.isArray(value)) {
                    // Count array elements.
                    let count = 0;

                    value.forEach(item => {
                        count += this.countObjects(item);
                    });

                    return count;
                } else {
                    // Count object properties.
                    let count = 0;

                    Object.keys(value).forEach(propertyKey => {
                        count += this.countObjects(value[propertyKey]);
                    });

                    return count;
                }

            case "undefined":
                return 0;

            default: // Primitives.
                return 1;
        }
    }

    private static readXMLToInstance<T>(
        xml: any,
        settings: ReadSettings<T>
    ): T {
        var object: any;
        var objectMetadata: XMLObjectMetadata<any>;
        var ObjectType: Constructor<T>;
        var typeHint: string;
        var temp: any;
        var knownTypes: { [name: string]: Constructor<any> };
        
        if (typeof xml === "undefined" || xml === null) {
            if (settings.isRequired) {
                throw new Error(`Missing required member.`);
            }
        } else if (Helpers.isPrimitive(settings.objectType)) {
            // number, string, boolean: assign directly.
            if (xml.constructor !== settings.objectType) {
                let expectedTypeName = Helpers.getClassName(settings.objectType).toLowerCase();
                let foundTypeName = Helpers.getClassName(xml.constructor).toLowerCase();

                throw new TypeError(`Expected value to be of type '${expectedTypeName}', got '${foundTypeName}'.`);
            }

            object = xml;
        } else if (settings.objectType as any === Array) {
            // 'xml' is expected to be an Array.
            if (!Helpers.isArray(xml)) {
                throw new TypeError(`Expected value to be of type 'Array', got '${Helpers.getClassName(xml.constructor)}'.`);
            }

            object = [];

            // Read array elements recursively.
            xml.forEach(element => {
                object.push(this.readXMLToInstance(element, {
                    elements: settings.elements ? settings.elements.elements : null,
                    enableTypeHints: settings.enableTypeHints,
                    knownTypes: settings.knownTypes,
                    objectType: settings.elements ? settings.elements.type : element.constructor,
                    requireTypeHints: settings.requireTypeHints,
                    strictTypeHintMode: settings.strictTypeHintMode,
                    typeHintPropertyKey: settings.typeHintPropertyKey
                }));
            });
        } else if (settings.objectType as any === Date) {
            // Built-in support for Date with ISO 8601 format.
            // ISO 8601 spec.: https://www.w3.org/TR/NOTE-datetime
            if (typeof xml === "string") {
                object = new Date(xml);
            } else {
                throw new TypeError(`Expected value to be of type 'string', got '${typeof xml}'.`);
            }
        } else {
            // 'xml' can only be an object.
            // Check if a type-hint is present.
            typeHint = xml[settings.typeHintPropertyKey];
            
            if (typeHint && settings.enableTypeHints) {
                if (typeof typeHint !== "string") {
                    throw new TypeError(`Type-hint (${settings.typeHintPropertyKey}) must be a string.`);
                }

                // Check if type-hint refers to a known type.
                if (!settings.knownTypes[typeHint]) {
                    throw new Error(`'${typeHint}' is not a known type.`);
                }

                // In strict mode, check if type-hint is a subtype of the expected type.
                if (settings.strictTypeHintMode && !Helpers.isSubtypeOf(settings.knownTypes[typeHint], settings.objectType)) {
                    throw new Error(`'${typeHint}' is not a subtype of '${Helpers.getClassName(settings.objectType)}'.`);
                }

                // Type-hinting was enabled and a valid type-hint has been found.
                ObjectType = settings.knownTypes[typeHint];

                // Also replace object metadata with that of what was referenced in the type-hint.
                objectMetadata = XMLObjectMetadata.getFromType(ObjectType);
            } else {
                if (settings.enableTypeHints && settings.requireTypeHints) {
                    throw new Error("Missing required type-hint.");
                }

                ObjectType = settings.objectType;
                objectMetadata = XMLObjectMetadata.getFromType(settings.objectType);
            }

            if (objectMetadata)
            {
                if (typeof objectMetadata.initializer === "function") {
                    // Let the initializer function handle it.
                    object = objectMetadata.initializer(xml) || null;
                } else {
                    // Deserialize @XMLMembers.
                    objectMetadata.sortMembers();

                    object = new ObjectType();
                    
                    Object.keys(objectMetadata.dataMembers).forEach(propertyKey => {
                        var propertyMetadata = objectMetadata.dataMembers[propertyKey];

                        temp = this.readXMLToInstance(xml[propertyMetadata.name], {
                            elements: propertyMetadata.elements,
                            enableTypeHints: settings.enableTypeHints,
                            isRequired: propertyMetadata.isRequired,
                            knownTypes: Helpers.merge(settings.knownTypes, objectMetadata.knownTypes || {}),
                            objectType: propertyMetadata.type,
                            requireTypeHints: settings.requireTypeHints,
                            strictTypeHintMode: settings.strictTypeHintMode,
                            typeHintPropertyKey: settings.typeHintPropertyKey
                        });

                        // Do not make undefined/null property assignments.
                        if (Helpers.valueIsDefined(temp)) {
                            object[propertyKey] = temp;
                        }
                    });
                }
            } else {
                // Deserialize each property of (from) 'xml'.
                object = {};

                Object.keys(xml).forEach(propertyKey => {
                    // Skip type-hint when copying properties.
                    if (xml[propertyKey] && propertyKey !== settings.typeHintPropertyKey) {
                        object[propertyKey] = this.readXMLToInstance(xml[propertyKey], {
                            enableTypeHints: settings.enableTypeHints,
                            knownTypes: settings.knownTypes,
                            objectType: xml[propertyKey].constructor,
                            requireTypeHints: settings.requireTypeHints,
                            typeHintPropertyKey: settings.typeHintPropertyKey
                        });
                    }
                });
            }
        }

        return object;
    }
}
//#endregion

//#region "TypedXML"
interface TypedXML {
    /**
     * Converts a JavaScript Object Notation (JSON) string into an object.
     * @param text A valid JSON string.
     * @param reviver A function that transforms the results. This function is called for each member of the object. 
     * If a member contains nested objects, the nested objects are transformed before the parent object is. 
     */
    parse(text: string, reviver?: (key: any, value: any) => any): any;

    /**
     * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
     * @param value A JavaScript value, usually an object or array, to be converted.
     */
    stringify(value: any): string;

    /**
     * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
     * @param value A JavaScript value, usually an object or array, to be converted.
     * @param replacer A function that transforms the results.
     */
    stringify(value: any, replacer: (key: string, value: any) => any): string;

    /**
     * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
     * @param value A JavaScript value, usually an object or array, to be converted.
     * @param replacer Array that transforms the results.
     */
    stringify(value: any, replacer: any[]): string;

    /**
     * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
     * @param value A JavaScript value, usually an object or array, to be converted.
     * @param replacer A function that transforms the results.
     * @param space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
     */
    stringify(value: any, replacer: (key: string, value: any) => any, space: string | number): string;

    /**
     * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
     * @param value A JavaScript value, usually an object or array, to be converted.
     * @param replacer Array that transforms the results.
     * @param space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
     */
    stringify(value: any, replacer: any[], space: string | number): string;
    
    /**
     * Converts a JavaScript Object Notation (JSON) string into an instance of the provided class.
     * @param text A valid JSON string.
     * @param type A class from which an instance is created using the provided JSON string.
     * @param settings Per-use serializer settings. Unspecified keys are assigned from global config.
     */
    parse<T>(text: string, type: { new (): T }, settings?: SerializerSettings): T;

    /**
     * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
     * @param value A JavaScript value, usually an object or array, to be converted.
     * @param settings Per-use serializer settings. Unspecified keys are assigned from global config.
     */
    stringify(value: any, settings?: SerializerSettings): string;

    /**
     * Configures TypedXML with custom settings. New settings will be assigned to existing settings.
     * @param settings The settings object.
     */
    config(settings: SerializerSettings): void;
}

// Default settings.
var configSettings: SerializerSettings = {
    enableTypeHints: true,
    typeHintPropertyKey: "__type"
};

var TypedXML: TypedXML = {
    config: function (settings: SerializerSettings) {
        configSettings = Helpers.merge(configSettings, settings);
    },
    stringify: function (value: any, settings?: SerializerSettings): string {
        return Serializer.writeObject(value, Helpers.merge(configSettings, settings || {}));
    },
    parse: function (xml: string, type?: any, settings?: SerializerSettings): any {
        if (XMLObjectMetadata.getFromType(type)) {
            return Deserializer.readObject(xml, type, Helpers.merge(configSettings, settings || {}));
        } else {
            return JSON.parse.apply(JSON, arguments);
        }
    }
};
//#endregion

export { SerializerSettings, TypedXML, XMLObjectOptions, XMLObject, XMLMemberOptions, XMLMember };

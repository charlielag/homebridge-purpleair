"use strict";

var Service, Characteristic;
var purpleAirService;
var request = require('request');

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-purpleair", "PurpleAir", PurpleAirAccessory);
};


/**
 * PurpleAir Accessory
 */
function PurpleAirAccessory(log, config) {
    this.log = log;

    // Name and API key from airly
    // this.name = config['name'];
    this.purpleID = config['purpleID'];
    this.updateFreq = config['updateFreq'];

    // Latitude and longitude
    // this.latitude = config['latitude'];
    // this.longitude = config['longitude'];


    // if (!this.latitude) throw new Error("Airly - you must provide a config value for 'latitude'.");
    // if (!this.longitude) throw new Error("Airly - you must provide a config value for 'longitude'.");


    this.lastupdate = 0;
    this.cache = undefined;

    this.log.info("PurpleAir is working");
}


PurpleAirAccessory.prototype = {

    /**
     * Get all Air data from airly
     */
    getAirData: function (callback) {
        var self = this;
        var aqi = 0;
                uri: 'https://www.purpleair.com',
        path: '/json',
        query: [show: settings.purpleID]
        var url = 'https://www.purpleair.com/json?show:' + this.purpleID;


        // Make request only every ten minutes
        if (this.lastupdate === 0 || this.lastupdate + this.updateFreq < (new Date().getTime() / 1000) || this.cache === undefined) {

            request({
                url: url,
                json: true,
                // headers: {
                //    'apikey': self.apikey
                //}
            }, function (err, response, data) {

                // If no errors
                if (!err && response.statusCode === 200) {

                    aqi = self.updateData(data, 'Fetch');
                    callback(null, self.transformAQI(aqi));

                    // If error
                } else {
                    purpleAirService.setCharacteristic(Characteristic.StatusFault, 1);
                    self.log.error("PurpleAir Network or Unknown Error.");
                    callback(err);
                }

            });

            // Return cached data
        } else {
            aqi = self.updateData(self.cache, 'Cache');
            callback(null, self.transformAQI(aqi));
        }
    },


    /**
     * Update data
     */
    updateData: function (data, type) {

        purpleAirService.setCharacteristic(Characteristic.StatusFault, 0);
/////
        airService.setCharacteristic(Characteristic.PM2_5Density, data.pm25);
        airService.setCharacteristic(Characteristic.PM10Density, data.pm10);

        var aqi = data.airQualityIndex;
        this.log.info("[%s] Airly air quality is: %s.", type, aqi.toString());

        this.cache = data;

        if (type === 'Fetch') {
            this.lastupdate = new Date().getTime() / 1000;
        }

        return aqi;
    },


    /**
     * Return Air Quality Index
     * @param aqi
     * @returns {number}
     */
    transformAQI: function (aqi) {
        if (!aqi) {
            return (0); // Error or unknown response
        } else if (aqi <= 25) {
            return (1); // Return EXCELLENT
        } else if (aqi > 25 && aqi <= 50) {
            return (2); // Return GOOD
        } else if (aqi > 50 && aqi <= 75) {
            return (3); // Return FAIR
        } else if (aqi > 75 && aqi <= 100) {
            return (4); // Return INFERIOR
        } else if (aqi > 100) {
            return (5); // Return POOR (Homekit only goes to cat 5, so combined the last two AQI cats of Very Unhealty and Hazardous.
        } else {
            return (0); // Error or unknown response.
        }
    },


    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },


    getServices: function () {
        var services = [];

        /**
         * Informations
         */
        var informationService = new Service.AccessoryInformation();
        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Airly")
            .setCharacteristic(Characteristic.Model, "API")
            .setCharacteristic(Characteristic.SerialNumber, "123-456");
        services.push(informationService);

        /**
         * AirService
         */
        airService = new Service.AirQualitySensor(this.name);

        airService
            .getCharacteristic(Characteristic.AirQuality)
            .on('get', this.getAirData.bind(this));

        airService.addCharacteristic(Characteristic.StatusFault);
        airService.addCharacteristic(Characteristic.PM2_5Density);
        airService.addCharacteristic(Characteristic.PM10Density);
        services.push(airService);


        return services;
    }
};


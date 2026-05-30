/**
 * __mocks__/react-native-maps.js
 *
 * Manual mock for react-native-maps.
 * Used by Jest when the package is not yet installed.
 */
const React = require('react');
const { View } = require('react-native');

const MapView = (props) => React.createElement(View, { testID: props.testID ?? 'map-view', ...props });
MapView.Marker = (props) => React.createElement(View, { testID: props.testID ?? 'map-marker', ...props });
MapView.Polyline = (props) => React.createElement(View, { testID: props.testID ?? 'map-polyline', ...props });

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker   = MapView.Marker;
module.exports.Polyline = MapView.Polyline;

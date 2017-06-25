/* GitHub Pull Explorer Application Code
   https://github.com/DominicBlais/pullexplorer for more info

   Notes:
     TBD
 */

var nextPageRegex = new RegExp('&page=([1-9][0-9]*)>; rel="next"');
var lastPageRegex = new RegExp('&page=([1-9][0-9]*)>; rel="last"');
var IS_LOADING = false;

function setRepoTo(repoName) {
    angular.element($('#org-name').val(repoName)).triggerHandler('change');
}


/* conf is {nextPage:int, lastPage:int, data:[]} */
function setStatusAndGetDataChunk(conf, url, callback) {
    $.ajax({
        type: 'GET',
        url: url + 'page=' + conf.nextPage,
        async: false,
        headers:{'Accept': 'application/vnd.github.v3+json'},
        complete: function(resp) {
            if (resp.status == 200) {
                var link = resp.getResponseHeader('Link');
                if (link == null) {
                    conf.nextPage = -1;
                } else {
                    if (conf.lastPage < 1) {
                        var m = link.match(lastPageRegex);
                        if (m != null) {
                            conf.lastPage = parseInt(m[1]);
                        }
                    }
                    var m = link.match(nextPageRegex);
                    if (m != null) {
                        conf.nextPage = parseInt(m[1]);
                    }
                }
                conf.data.push.apply(conf.data, JSON.parse(resp.responseText));
                $('#status').text('Loading data (' + Math.round(conf.nextPage / conf.lastPage * 100) + '%)...');  
                if (url.indexOf('/pulls?state=all') > 0) {  // xxx code smell
                    $('#pull-count').text('Pulls (' + conf.data.length + ') - Click to Select');
                }
            } else {
                alert("Error contacting GitHub: " + resp.responseText);
                conf.nextPage = -1; // break
            }
        }
    });
    if (conf.lastPage > 1 && conf.nextPage < conf.lastPage) {
        // relinquishing control to UI to update status
        setTimeout(function() {
            setStatusAndGetDataChunk(conf, url, callback);
        }, 1);
    } else {
        IS_LOADING = false;
        $('#loading').hide();
        callback(conf);
    }
}



function getAllDataAtUrl(url, callback) {
    if (IS_LOADING) {
        return;
    } else {
        $('#loading').show();
        IS_LOADING = true;
    }
    if (url.indexOf('?') > 0) {
        url += '&';
    } else {
        url += '?';
    }
    var conf = {
        data:[],
        nextPage:1,
        lastPage:-1
    };
    $('#status').text('Loading data (0%)...');
    setTimeout(function() {
        setStatusAndGetDataChunk(conf, url, callback);
    }, 1);
}


angular.module('pullorerApp', []).controller('PullorerController', ['$scope',
    function ($scope) {
        $scope.org = {name:'', repo:''};
        $scope.repo = [{name:''}];

        $scope.loadRepos = function() {
            var url = 'https://api.github.com/orgs/' + encodeURIComponent($scope.org.name.trim()) + '/repos';
            getAllDataAtUrl(url, function(conf) {
                $scope.$apply(function() {
                    $scope.repos = conf.data;
                });
            });
        };  

        $scope.loadPulls = function() {
            var url = 'https://api.github.com/repos/' + encodeURIComponent($scope.org.name.trim()) + '/' + encodeURIComponent($scope.org.repo) + '/pulls?state=all';
            getAllDataAtUrl(url, function(conf) {
                $scope.$apply(function() {
                    $scope.pulls = conf.data;
                });
            });
        };

        $scope.setPull = function(idx) {
            $scope.pull = $scope.pulls[idx];
        };
    }
]);

$(function() {
    $('#loading').hide();
});

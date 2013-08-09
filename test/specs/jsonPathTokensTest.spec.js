jsonPathSyntax(function (pathNodeDesc, doubleDotDesc, dotDesc, bangDesc, emptyDesc) {

   function givenDescriptor(descriptor) {
      return new NodeDescriptionAsserter(descriptor);
   }

   function NodeDescriptionAsserter(descriptor) {
      this._descriptor = descriptor;
   }

   NodeDescriptionAsserter.prototype.whenDescribing = function (pathFragment) {
      this._found = this._descriptor(pathFragment);
      return this;
   };

   NodeDescriptionAsserter.prototype.shouldFind = function (expected) {

      if (expected && !this._found) {
         if (!expected.capturing && !expected.name && !expected.fieldList) {
            return this; // wasn't expecting to find anything
         }

         throw new Error('wanted to find ' + JSON.stringify(expected) + ' but did not find any matches');
      }

      expect(!!this._found[1]).toBe(!!expected.capturing);
      expect(this._found[2]).toBe(expected.name || '');
      expect(this._found[3] || '').toBe(expected.fieldList || '');

      return this;
   };

   function RegexMatchAsserter(pattern) {
      this._regex = pattern;
   }

   RegexMatchAsserter.prototype.shouldNotMatch = function (candidate) {

      this._candidate = candidate;

      assertFalse(

          'pattern ' + this._regex + ' should not have matched "' + candidate + '" but found' +
              JSON.stringify(this._regex.exec(candidate))
          , this._matched(candidate)
      );

      return this;
   };

   RegexMatchAsserter.prototype.finding = function (expected) {

      var result = this._regex.exec(this._candidate);

      assertEquals(expected, result[1]);

      return this;
   };

   RegexMatchAsserter.prototype._matched = function (candidate) {

      var result = this._regex.exec(candidate);
      return !!(result && (result[0] === candidate));
   };

   RegexMatchAsserter.prototype.capturing = function (arrayOfExpected) {

      return this;
   };


   describe('json path token parser', function () {

      beforeEach(function () {
         this.addMatchers({
            toContainMatches:function (expectedResults) {

               var foundResults = this.actual;

               if (expectedResults && !foundResults) {
                  if (!expectedResults.capturing && !expectedResults.name && !expectedResults.fieldList) {
                     return true; // wasn't expecting to find anything
                  }

                  this.message = function () {
                     return 'did not find anything'
                  };
                  return false;
               }

               if ((!!foundResults[1]    ) != (!!expectedResults.capturing)) {
                  return false
               }
               if ((foundResults[2]      ) != (expectedResults.name || '')) {
                  return false
               }
               if ((foundResults[3] || '') != (expectedResults.fieldList || '')) {
                  return false
               }

               return true;
            }
         });
      });

      describe('field list', function () {

         it('parses zero-length list', function () {
            expect(pathNodeDesc('{}')).toContainMatches({fieldList:''})
         });

         it('parses single field', function () {
            expect(pathNodeDesc('{a}')).toContainMatches({fieldList:'a'      })
         })
         
         it('parses two fields', function () {
            expect(pathNodeDesc('{r2 d2}')).toContainMatches({fieldList:'r2 d2'  })
         })
         
         it('parses numeric fields', function () {
            expect(pathNodeDesc('{1 2}')).toContainMatches({fieldList:'1 2'    })
         })
         
         it('ignores whitespace', function () {
            expect(pathNodeDesc('{a  b}')).toContainMatches({fieldList:'a  b'   })
         })
         
         it('ignores more whitespace', function () {
            expect(pathNodeDesc('{a   b}')).toContainMatches({fieldList:'a   b'  })
         })
         
         it('parses 3 fields', function () {
            expect(pathNodeDesc('{a  b  c}')).toContainMatches({fieldList:'a  b  c'})
         })
         
         it('needs a closing brace', function () {
            expect(pathNodeDesc('{a')).toContainMatches({})
         })
      })

      describe('object notation', function () {

         givenDescriptor(pathNodeDesc)
             .whenDescribing('aaa').shouldFind({name:'aaa'})
             .whenDescribing('$aaa').shouldFind({name:'aaa', capturing:true})
             .whenDescribing('aaa{a b c}').shouldFind({name:'aaa', fieldList:'a b c'})
             .whenDescribing('$aaa{a b c}').shouldFind({name:'aaa', capturing:true, fieldList:'a b c'})

             .whenDescribing('.a').shouldFind({})
             .whenDescribing('a.b').shouldFind({name:'a'})
             .whenDescribing('$$a').shouldFind({})
             .whenDescribing('.a{').shouldFind({})
      })

      describe('named array notation', function () {

         givenDescriptor(pathNodeDesc)
             .whenDescribing('["foo"]').shouldFind({name:'foo'})
             .whenDescribing('$["foo"]').shouldFind({name:'foo', capturing:true})
             .whenDescribing('["foo"]{a b c}').shouldFind({name:'foo', fieldList:'a b c'})
             .whenDescribing('$["foo"]{a b c}').shouldFind({name:'foo', capturing:true, fieldList:'a b c'})

             .whenDescribing('[]').shouldFind({})
             .whenDescribing('[foo]').shouldFind({})
             .whenDescribing('[""]').shouldFind({})
             .whenDescribing('["foo"]["bar"]').shouldFind({name:'foo'})
             .whenDescribing('[".foo"]').shouldFind({})
      })

      describe('numbered array notation', function () {

         givenDescriptor(pathNodeDesc)
             .whenDescribing('[2]').shouldFind({name:'2'})
             .whenDescribing('[123]').shouldFind({name:'123'})
             .whenDescribing('$[2]').shouldFind({name:'2', capturing:true})
             .whenDescribing('[2]{a b c}').shouldFind({name:'2', fieldList:'a b c'})
             .whenDescribing('$[2]{a b c}').shouldFind({name:'2', capturing:true, fieldList:'a b c'})

             .whenDescribing('[]').shouldFind({})
             .whenDescribing('[""]').shouldFind({})
      })

      describe('can parse node description with name and field list', function () {

         givenDescriptor(pathNodeDesc)
             .whenDescribing('foo{a b}')
             .shouldFind({  capturing:false,
                name:'foo',
                fieldList:'a b'
             });

      })

      describe('can parse node description with name only', function () {

         givenDescriptor(pathNodeDesc)
             .whenDescribing('foo')
             .shouldFind({  capturing:false,
                name:'foo',
                fieldList:null
             });

      })

      describe('can parse capturing node description with name and field list', function () {

         givenDescriptor(pathNodeDesc)
             .whenDescribing('$foo{a b}')
             .shouldFind({  capturing:true,
                name:'foo',
                fieldList:'a b'
             });

      })

      describe('can parse node description with name only in array notation', function () {
         givenDescriptor(pathNodeDesc)
             .whenDescribing('["foo"]')
             .shouldFind({  capturing:false,
                name:'foo',
                fieldList:null
             });

      })

      describe('can parse node description in pure duck type notation', function () {
         givenDescriptor(pathNodeDesc)
             .whenDescribing('{a b c}')
             .shouldFind({  capturing:false,
                name:'',
                fieldList:'a b c'
             });

      })


   });

});